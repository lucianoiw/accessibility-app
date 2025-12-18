-- ============================================
-- PROJECT CONFIG SNAPSHOT
-- Consolida todas as configuracoes do projeto em um unico campo JSONB
-- Isso garante que o snapshot seja completo mesmo quando novas configs
-- sao adicionadas ao projeto
-- ============================================

-- Adicionar campo de snapshot completo
ALTER TABLE audits
ADD COLUMN project_config_snapshot JSONB DEFAULT '{}';

-- Comentarios para documentacao
COMMENT ON COLUMN audits.project_config_snapshot IS 'Snapshot completo das configuracoes do projeto no momento da criacao da auditoria';

-- Nota: As colunas individuais (max_pages, wcag_levels, include_abnt, include_emag,
-- include_coga, discovery_method, discovery_config) sao mantidas por compatibilidade
-- e para facilitar queries. O campo project_config_snapshot e a fonte autoritativa
-- para quaisquer novas configuracoes adicionadas ao projeto.
--
-- Estrutura do project_config_snapshot:
-- {
--   "id": "uuid",
--   "name": "Nome do Projeto",
--   "base_url": "https://example.com",
--   "description": "Descricao",
--   "default_max_pages": 100,
--   "default_wcag_levels": ["A", "AA"],
--   "default_include_abnt": true,
--   "default_include_emag": true,
--   "default_include_coga": false,
--   "discovery_method": "crawler",
--   "discovery_config": { ... },
--   "auth_config": { "type": "none" },
--   "subdomain_policy": "main_only",
--   "allowed_subdomains": null,
--   "snapshot_at": "2024-01-01T00:00:00.000Z"
-- }
