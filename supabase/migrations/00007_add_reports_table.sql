-- Tabela de relatorios gerados
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'executive_pdf', 'technical_pdf', 'csv', 'json'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  file_url TEXT, -- URL no Supabase Storage
  file_name TEXT, -- Nome do arquivo para download
  file_size INTEGER, -- Tamanho em bytes
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index para buscar relatorios de uma auditoria
CREATE INDEX idx_reports_audit_id ON reports(audit_id);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: usuarios podem ver relatorios de suas auditorias
CREATE POLICY "Users can view reports of their audits"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = reports.audit_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: usuarios podem inserir relatorios para suas auditorias
CREATE POLICY "Users can insert reports for their audits"
  ON reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = audit_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: service role pode fazer tudo (para Trigger.dev)
CREATE POLICY "Service role has full access to reports"
  ON reports FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
