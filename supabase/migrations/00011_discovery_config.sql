-- ============================================
-- DISCOVERY CONFIG - Configuracao de descoberta de paginas
-- Permite escolher entre Manual, Sitemap ou Rastreamento
-- ============================================

-- Adicionar campos de configuracao de descoberta na tabela audits
ALTER TABLE audits
ADD COLUMN discovery_method TEXT DEFAULT 'crawler'
  CHECK (discovery_method IN ('manual', 'sitemap', 'crawler')),
ADD COLUMN discovery_config JSONB DEFAULT '{}';

-- Comentarios para documentacao
COMMENT ON COLUMN audits.discovery_method IS 'Metodo de descoberta: manual, sitemap, crawler';
COMMENT ON COLUMN audits.discovery_config IS 'Configuracao especifica do metodo de descoberta';

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
