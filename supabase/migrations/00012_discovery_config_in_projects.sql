-- ============================================
-- DISCOVERY CONFIG IN PROJECTS
-- Move configuracao de descoberta para projetos
-- Auditorias mantém snapshot para histórico
-- ============================================

-- Adicionar campos de configuracao de descoberta na tabela projects
ALTER TABLE projects
ADD COLUMN discovery_method TEXT DEFAULT 'crawler'
  CHECK (discovery_method IN ('manual', 'sitemap', 'crawler')),
ADD COLUMN discovery_config JSONB DEFAULT '{}';

-- Comentarios para documentacao
COMMENT ON COLUMN projects.discovery_method IS 'Metodo padrao de descoberta: manual, sitemap, crawler';
COMMENT ON COLUMN projects.discovery_config IS 'Configuracao padrao do metodo de descoberta';

-- Atualizar comentarios na tabela audits para clareza
COMMENT ON COLUMN audits.discovery_method IS 'Snapshot do metodo usado nesta auditoria (copiado do projeto)';
COMMENT ON COLUMN audits.discovery_config IS 'Snapshot da configuracao usada nesta auditoria (copiado do projeto)';

-- Estrutura do discovery_config por metodo:
--
-- manual: {
--   "urls": ["https://example.com/page1", "https://example.com/page2"]
-- }
--
-- sitemap: {
--   "sitemapUrl": "https://example.com/sitemap.xml",
--   "maxPages": 100
-- }
--
-- crawler: {
--   "startUrl": "https://example.com/blog/",
--   "excludePaths": ["/admin/*", "/api/*"],
--   "depth": 2,
--   "maxPages": 100
-- }
