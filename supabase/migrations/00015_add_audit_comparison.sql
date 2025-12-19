-- ============================================
-- Migration: Add Audit Comparison Support
-- ============================================
-- Adiciona suporte para comparacao entre auditorias e tracking de evolucao

-- 1. Adicionar campos na tabela audits
ALTER TABLE audits ADD COLUMN IF NOT EXISTS health_score DECIMAL(5,2);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS previous_audit_id UUID REFERENCES audits(id);

-- Indice para buscar auditorias anteriores do mesmo projeto rapidamente
CREATE INDEX IF NOT EXISTS idx_audits_project_created ON audits(project_id, created_at DESC);

-- Indice para encontrar auditoria anterior
CREATE INDEX IF NOT EXISTS idx_audits_previous_audit ON audits(previous_audit_id) WHERE previous_audit_id IS NOT NULL;

-- 2. Criar tabela de comparacoes (cache)
CREATE TABLE IF NOT EXISTS audit_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  previous_audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,

  -- Deltas de summary por severidade
  delta_critical INTEGER NOT NULL DEFAULT 0,
  delta_serious INTEGER NOT NULL DEFAULT 0,
  delta_moderate INTEGER NOT NULL DEFAULT 0,
  delta_minor INTEGER NOT NULL DEFAULT 0,
  delta_total INTEGER NOT NULL DEFAULT 0,

  -- Delta de score de saude
  delta_health_score DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Deltas de paginas
  delta_pages_audited INTEGER NOT NULL DEFAULT 0,
  delta_broken_pages INTEGER NOT NULL DEFAULT 0,

  -- Contagens de violacoes por tipo de mudanca
  new_violations_count INTEGER NOT NULL DEFAULT 0,
  fixed_violations_count INTEGER NOT NULL DEFAULT 0,
  persistent_violations_count INTEGER NOT NULL DEFAULT 0,
  worsened_violations_count INTEGER NOT NULL DEFAULT 0,
  improved_violations_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Cada par de auditorias so pode ter uma comparacao
  UNIQUE(audit_id, previous_audit_id)
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_audit_comparisons_audit_id ON audit_comparisons(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_comparisons_previous_audit_id ON audit_comparisons(previous_audit_id);

-- 3. Criar tabela de mudancas de violacoes (detalhes)
CREATE TABLE IF NOT EXISTS violation_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID NOT NULL REFERENCES audit_comparisons(id) ON DELETE CASCADE,

  -- Identificacao da violacao
  rule_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,

  -- Tipo de mudanca: new, fixed, persistent, worsened, improved
  change_type TEXT NOT NULL CHECK (change_type IN ('new', 'fixed', 'persistent', 'worsened', 'improved')),

  -- Dados da violacao atual (se existir)
  current_occurrences INTEGER,
  current_page_count INTEGER,
  current_impact TEXT,

  -- Dados da violacao anterior (se existir)
  previous_occurrences INTEGER,
  previous_page_count INTEGER,
  previous_impact TEXT,

  -- Delta
  delta_occurrences INTEGER NOT NULL DEFAULT 0,
  delta_page_count INTEGER NOT NULL DEFAULT 0,

  -- Metadados extras para exibicao
  help TEXT,
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_violation_changes_comparison_id ON violation_changes(comparison_id);
CREATE INDEX IF NOT EXISTS idx_violation_changes_change_type ON violation_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_violation_changes_rule_id ON violation_changes(rule_id);

-- 4. RLS (Row Level Security) para as novas tabelas
ALTER TABLE audit_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE violation_changes ENABLE ROW LEVEL SECURITY;

-- Politicas para audit_comparisons: usuario pode ver comparacoes de auditorias dos seus projetos
CREATE POLICY "Users can view their audit comparisons" ON audit_comparisons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = audit_comparisons.audit_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their audit comparisons" ON audit_comparisons
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = audit_comparisons.audit_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their audit comparisons" ON audit_comparisons
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = audit_comparisons.audit_id
      AND p.user_id = auth.uid()
    )
  );

-- Politicas para violation_changes: herda de audit_comparisons
CREATE POLICY "Users can view their violation changes" ON violation_changes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audit_comparisons ac
      JOIN audits a ON a.id = ac.audit_id
      JOIN projects p ON p.id = a.project_id
      WHERE ac.id = violation_changes.comparison_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their violation changes" ON violation_changes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_comparisons ac
      JOIN audits a ON a.id = ac.audit_id
      JOIN projects p ON p.id = a.project_id
      WHERE ac.id = violation_changes.comparison_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their violation changes" ON violation_changes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM audit_comparisons ac
      JOIN audits a ON a.id = ac.audit_id
      JOIN projects p ON p.id = a.project_id
      WHERE ac.id = violation_changes.comparison_id
      AND p.user_id = auth.uid()
    )
  );

-- Comentarios para documentacao
COMMENT ON TABLE audit_comparisons IS 'Cache de comparacoes entre auditorias para evitar recalcular';
COMMENT ON TABLE violation_changes IS 'Detalhes das mudancas de violacoes entre auditorias';
COMMENT ON COLUMN audits.health_score IS 'Score de saude calculado (0-100) baseado em severidade ponderada';
COMMENT ON COLUMN audits.previous_audit_id IS 'Referencia para a auditoria anterior do mesmo projeto';
