-- ============================================
-- COGA (Cognitive Accessibility) SUPPORT
-- Adiciona suporte a regras de acessibilidade cognitiva
-- Baseado no W3C COGA Task Force
-- ============================================

-- Adicionar configuracao padrao de COGA em projetos
ALTER TABLE projects
ADD COLUMN default_include_coga BOOLEAN DEFAULT FALSE;

-- Adicionar configuracao de COGA em auditorias
ALTER TABLE audits
ADD COLUMN include_coga BOOLEAN DEFAULT FALSE;

-- Comentarios para documentacao
COMMENT ON COLUMN projects.default_include_coga IS 'Se deve incluir regras COGA (acessibilidade cognitiva) por padrao nas auditorias';
COMMENT ON COLUMN audits.include_coga IS 'Se esta auditoria inclui regras COGA (acessibilidade cognitiva)';
