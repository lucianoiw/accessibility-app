-- ============================================
-- EMAG 3.1 SUPPORT
-- Adiciona suporte a conformidade com eMAG
-- ============================================

-- Adicionar configuracao padrao de eMAG em projetos
ALTER TABLE projects
ADD COLUMN default_include_emag BOOLEAN DEFAULT TRUE;

-- Adicionar configuracao de eMAG em auditorias
ALTER TABLE audits
ADD COLUMN include_emag BOOLEAN DEFAULT TRUE;

-- Adicionar recomendacoes eMAG em violacoes agregadas
-- Array de IDs como "1.1", "3.6", "6.8"
ALTER TABLE aggregated_violations
ADD COLUMN emag_recommendations TEXT[] DEFAULT '{}';

-- Adicionar recomendacoes eMAG em violacoes individuais tambem
ALTER TABLE violations
ADD COLUMN emag_recommendations TEXT[] DEFAULT '{}';

-- Indices para filtros eMAG
CREATE INDEX idx_aggregated_violations_emag ON aggregated_violations USING GIN (emag_recommendations);
CREATE INDEX idx_violations_emag ON violations USING GIN (emag_recommendations);

-- Comentarios para documentacao
COMMENT ON COLUMN projects.default_include_emag IS 'Se deve incluir mapeamento eMAG 3.1 por padrao nas auditorias';
COMMENT ON COLUMN audits.include_emag IS 'Se esta auditoria inclui mapeamento eMAG 3.1';
COMMENT ON COLUMN aggregated_violations.emag_recommendations IS 'Lista de recomendacoes eMAG violadas (ex: ["1.1", "3.6"])';
COMMENT ON COLUMN violations.emag_recommendations IS 'Lista de recomendacoes eMAG violadas (ex: ["1.1", "3.6"])';
