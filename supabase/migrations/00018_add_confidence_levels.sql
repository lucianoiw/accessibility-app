-- ============================================
-- Migration: Add Confidence Levels to Violations
-- Fase 1 do plano de melhoria de precisão
-- ============================================

-- Criar enum para confidence level
CREATE TYPE confidence_level AS ENUM ('certain', 'likely', 'needs_review');

-- Criar enum para review reason
CREATE TYPE review_reason AS ENUM (
  'context_dependent',
  'possibly_decorative',
  'possibly_intentional',
  'detection_limited',
  'external_resource',
  'user_preference'
);

-- Adicionar colunas à tabela aggregated_violations
ALTER TABLE aggregated_violations
ADD COLUMN confidence_level confidence_level NOT NULL DEFAULT 'certain',
ADD COLUMN confidence_score DECIMAL(3,2) NOT NULL DEFAULT 1.0,
ADD COLUMN confidence_reason review_reason,
ADD COLUMN confidence_signals JSONB,
ADD COLUMN is_experimental BOOLEAN NOT NULL DEFAULT false;

-- Índice para filtrar por nível de confiança
CREATE INDEX idx_aggregated_violations_confidence
ON aggregated_violations(audit_id, confidence_level);

-- Índice para filtrar regras experimentais
CREATE INDEX idx_aggregated_violations_experimental
ON aggregated_violations(audit_id, is_experimental)
WHERE is_experimental = true;

-- Comentários para documentação
COMMENT ON COLUMN aggregated_violations.confidence_level IS
  'Nível de certeza da detecção: certain (100%), likely (~90%), needs_review (requer humano)';

COMMENT ON COLUMN aggregated_violations.confidence_score IS
  'Score de confiança de 0.0 a 1.0, onde 1.0 é certeza absoluta';

COMMENT ON COLUMN aggregated_violations.confidence_reason IS
  'Razão pela qual a violação precisa de revisão (se confidence_level = needs_review)';

COMMENT ON COLUMN aggregated_violations.confidence_signals IS
  'Array de sinais que influenciaram a decisão de confiança';

COMMENT ON COLUMN aggregated_violations.is_experimental IS
  'Se true, a regra é experimental e pode ter mais falsos positivos';
