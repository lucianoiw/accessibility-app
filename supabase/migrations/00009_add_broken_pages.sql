-- ============================================
-- BROKEN PAGES TRACKING
-- Rastreia paginas que falharam durante auditoria
-- ============================================

-- Criar tabela de paginas quebradas
CREATE TABLE broken_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  error_type TEXT NOT NULL,  -- 'timeout' | 'http_error' | 'connection_error' | 'ssl_error' | 'other'
  http_status INT,           -- 404, 500, 502, 503, etc (null se nao for http_error)
  error_message TEXT NOT NULL,
  discovered_from TEXT,      -- URL pai que linkou para esta pagina
  attempted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(audit_id, url)
);

-- Indices para consultas
CREATE INDEX idx_broken_pages_audit_id ON broken_pages(audit_id);
CREATE INDEX idx_broken_pages_error_type ON broken_pages(error_type);

-- Adicionar contador de paginas quebradas na tabela audits
ALTER TABLE audits
ADD COLUMN broken_pages_count INT DEFAULT 0;

-- Adicionar contador de iteracoes de crawl
ALTER TABLE audits
ADD COLUMN crawl_iterations INT DEFAULT 0;

-- RLS (Row Level Security)
ALTER TABLE broken_pages ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios podem ver broken_pages de suas proprias auditorias
CREATE POLICY "Users can view own broken_pages" ON broken_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audits
      JOIN projects ON projects.id = audits.project_id
      WHERE audits.id = broken_pages.audit_id
      AND projects.user_id = auth.uid()
    )
  );

-- Politica: service role pode inserir (usado pelo trigger task)
CREATE POLICY "Service role can insert broken_pages" ON broken_pages
  FOR INSERT WITH CHECK (true);

-- Comentarios para documentacao
COMMENT ON TABLE broken_pages IS 'Paginas que falharam durante auditoria (404, timeout, etc)';
COMMENT ON COLUMN broken_pages.error_type IS 'Tipo do erro: timeout, http_error, connection_error, ssl_error, other';
COMMENT ON COLUMN broken_pages.http_status IS 'Codigo HTTP (404, 500, etc) - apenas para http_error';
COMMENT ON COLUMN broken_pages.discovered_from IS 'URL da pagina que continha o link para esta pagina quebrada';
COMMENT ON COLUMN audits.broken_pages_count IS 'Total de paginas quebradas encontradas nesta auditoria';
COMMENT ON COLUMN audits.crawl_iterations IS 'Numero de iteracoes de descoberta de URLs';
