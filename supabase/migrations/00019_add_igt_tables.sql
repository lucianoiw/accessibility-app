-- ============================================
-- Migration: Add Intelligent Guided Tests (IGT) Tables
-- ============================================

-- Criar enum para status de sessão IGT
CREATE TYPE igt_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');

-- Criar enum para resultado de resposta
CREATE TYPE igt_answer_result AS ENUM ('pass', 'fail', 'warning', 'needs_more', 'skip');

-- Criar enum para categoria de IGT
CREATE TYPE igt_category AS ENUM (
  'images',
  'links',
  'forms',
  'keyboard',
  'sign-language',
  'contrast',
  'structure',
  'multimedia'
);

-- ============================================
-- Tabela: igt_sessions
-- Armazena sessões de execução de IGTs
-- ============================================

CREATE TABLE igt_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  igt_id TEXT NOT NULL,  -- ID do IGT (ex: 'images-alt-quality')
  status igt_status NOT NULL DEFAULT 'not_started',

  -- Progresso
  current_candidate_index INTEGER NOT NULL DEFAULT 0,
  total_candidates INTEGER NOT NULL DEFAULT 0,

  -- Dados (armazenados como JSONB para flexibilidade)
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Usuário que executou
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: apenas uma sessão ativa por IGT por auditoria
  CONSTRAINT unique_igt_session UNIQUE (audit_id, igt_id)
);

-- Índices para igt_sessions
CREATE INDEX idx_igt_sessions_audit ON igt_sessions(audit_id);
CREATE INDEX idx_igt_sessions_status ON igt_sessions(audit_id, status);
CREATE INDEX idx_igt_sessions_user ON igt_sessions(user_id);

-- Trigger para updated_at
CREATE TRIGGER update_igt_sessions_updated_at
  BEFORE UPDATE ON igt_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para igt_sessions
ALTER TABLE igt_sessions ENABLE ROW LEVEL SECURITY;

-- Política: usuário pode ver sessões das suas auditorias
CREATE POLICY "Users can view IGT sessions for their audits"
  ON igt_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = igt_sessions.audit_id
      AND p.user_id = auth.uid()
    )
  );

-- Política: usuário pode inserir sessões nas suas auditorias
CREATE POLICY "Users can insert IGT sessions for their audits"
  ON igt_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = igt_sessions.audit_id
      AND p.user_id = auth.uid()
    )
  );

-- Política: usuário pode atualizar suas sessões
CREATE POLICY "Users can update their IGT sessions"
  ON igt_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política: usuário pode deletar suas sessões
CREATE POLICY "Users can delete their IGT sessions"
  ON igt_sessions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- Tabela: igt_violations
-- Violações geradas por IGTs
-- ============================================

CREATE TABLE igt_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES igt_sessions(id) ON DELETE CASCADE,
  igt_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,

  -- Dados da violação
  rule_id TEXT NOT NULL,
  impact impact_level NOT NULL,
  help TEXT NOT NULL,
  description TEXT NOT NULL,
  selector TEXT NOT NULL,
  html TEXT NOT NULL,
  page_url TEXT NOT NULL,

  -- Usuário que identificou
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Evitar duplicatas
  CONSTRAINT unique_igt_violation UNIQUE (session_id, candidate_id)
);

-- Índices para igt_violations
CREATE INDEX idx_igt_violations_audit ON igt_violations(audit_id);
CREATE INDEX idx_igt_violations_session ON igt_violations(session_id);
CREATE INDEX idx_igt_violations_rule ON igt_violations(rule_id);

-- RLS para igt_violations
ALTER TABLE igt_violations ENABLE ROW LEVEL SECURITY;

-- Política: usuário pode ver violações das suas auditorias
CREATE POLICY "Users can view IGT violations for their audits"
  ON igt_violations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = igt_violations.audit_id
      AND p.user_id = auth.uid()
    )
  );

-- Política: usuário pode inserir violações
CREATE POLICY "Users can insert IGT violations"
  ON igt_violations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política: usuário pode deletar suas violações
CREATE POLICY "Users can delete their IGT violations"
  ON igt_violations FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- Comentários para documentação
-- ============================================

COMMENT ON TABLE igt_sessions IS
  'Sessões de execução de Intelligent Guided Tests (IGT)';

COMMENT ON COLUMN igt_sessions.igt_id IS
  'ID do IGT sendo executado (ex: images-alt-quality)';

COMMENT ON COLUMN igt_sessions.candidates IS
  'Array de candidatos (elementos) a serem avaliados';

COMMENT ON COLUMN igt_sessions.answers IS
  'Array de respostas do usuário às perguntas';

COMMENT ON COLUMN igt_sessions.results IS
  'Array de resultados processados para cada candidato';

COMMENT ON TABLE igt_violations IS
  'Violações identificadas manualmente através de IGTs';

COMMENT ON COLUMN igt_violations.candidate_id IS
  'ID do candidato que gerou a violação';
