-- ============================================
-- FIX: Trigger de agendamento não recalcula após auditoria
-- ============================================
-- Problema: O trigger de UPDATE só dispara quando configs mudam,
-- mas não quando `last_scheduled_audit_at` é atualizado.
-- Isso causa auditorias rodando em loop toda hora.
--
-- Solução: Adicionar `last_scheduled_audit_at` à condição do trigger.

DROP TRIGGER IF EXISTS trg_update_next_scheduled_audit_update ON projects;

-- Trigger para UPDATE (dispara quando configs mudam OU quando auditoria roda)
CREATE TRIGGER trg_update_next_scheduled_audit_update
  BEFORE UPDATE
  ON projects
  FOR EACH ROW
  WHEN (
    (OLD.schedule_enabled IS DISTINCT FROM NEW.schedule_enabled) OR
    (OLD.schedule_frequency IS DISTINCT FROM NEW.schedule_frequency) OR
    (OLD.schedule_day_of_week IS DISTINCT FROM NEW.schedule_day_of_week) OR
    (OLD.schedule_day_of_month IS DISTINCT FROM NEW.schedule_day_of_month) OR
    (OLD.schedule_hour IS DISTINCT FROM NEW.schedule_hour) OR
    (OLD.schedule_timezone IS DISTINCT FROM NEW.schedule_timezone) OR
    (OLD.last_scheduled_audit_at IS DISTINCT FROM NEW.last_scheduled_audit_at)
  )
  EXECUTE FUNCTION update_next_scheduled_audit();

COMMENT ON TRIGGER trg_update_next_scheduled_audit_update ON projects IS
'Recalcula next_scheduled_audit_at quando configurações de agendamento mudam
OU quando last_scheduled_audit_at é atualizado (após uma auditoria rodar).';
