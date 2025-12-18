-- Migration: Adicionar status de verificação às violações agregadas
-- Permite marcar violações como corrigidas, ignoradas, etc.

-- Criar enum para status da violação
CREATE TYPE violation_status AS ENUM ('open', 'in_progress', 'fixed', 'ignored', 'false_positive');

-- Adicionar campos de status à tabela aggregated_violations
ALTER TABLE aggregated_violations
ADD COLUMN status violation_status DEFAULT 'open',
ADD COLUMN last_verified_at TIMESTAMPTZ,
ADD COLUMN verification_result JSONB,  -- { remaining: 5, fixed: 7, pages_checked: ['url1', 'url2'] }
ADD COLUMN resolution_notes TEXT,
ADD COLUMN resolved_by UUID REFERENCES profiles(id);

-- Índice para filtrar por status
CREATE INDEX idx_aggregated_violations_status ON aggregated_violations(status);

-- Comentários
COMMENT ON COLUMN aggregated_violations.status IS 'Status da violação: open, in_progress, fixed, ignored, false_positive';
COMMENT ON COLUMN aggregated_violations.last_verified_at IS 'Última vez que foi verificado se a violação ainda existe';
COMMENT ON COLUMN aggregated_violations.verification_result IS 'Resultado da última verificação: quantos ainda existem, quantos foram corrigidos';
COMMENT ON COLUMN aggregated_violations.resolution_notes IS 'Notas sobre a resolução (ex: "Corrigido no PR #123")';
COMMENT ON COLUMN aggregated_violations.resolved_by IS 'Usuário que marcou como resolvido';
