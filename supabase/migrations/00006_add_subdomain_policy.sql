-- ============================================
-- Add subdomain policy to projects
-- ============================================

-- Enum para política de subdomínio
CREATE TYPE subdomain_policy AS ENUM (
  'main_only',      -- Apenas domínio principal
  'all_subdomains', -- Todos os subdomínios
  'specific'        -- Subdomínios específicos
);

-- Adicionar colunas na tabela projects
ALTER TABLE projects
  ADD COLUMN subdomain_policy subdomain_policy DEFAULT 'main_only',
  ADD COLUMN allowed_subdomains TEXT[] DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN projects.subdomain_policy IS 'Política de crawl de subdomínios: main_only (só domínio principal), all_subdomains (segue todos), specific (apenas os listados)';
COMMENT ON COLUMN projects.allowed_subdomains IS 'Lista de subdomínios permitidos quando subdomain_policy = specific. Ex: ["www", "blog", "docs"]';
