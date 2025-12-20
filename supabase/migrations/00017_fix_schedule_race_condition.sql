-- ============================================
-- FIX: Race condition no agendamento
-- ============================================
-- Problema: Se o projeto for atualizado exatamente no horário agendado,
-- o trigger recalcula next_scheduled_audit_at para o próximo dia,
-- fazendo o cron job não encontrar o projeto.
--
-- Solução: Adicionar margem de 1 minuto na comparação.
-- Se estiver dentro de 1 minuto do horário agendado, considera "ainda não passou".

CREATE OR REPLACE FUNCTION calculate_next_scheduled_audit(
  p_frequency schedule_frequency,
  p_day_of_week INT,
  p_day_of_month INT,
  p_hour INT,
  p_timezone TEXT,
  p_from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next TIMESTAMPTZ;
  v_local_time TIMESTAMP;
  v_target_date DATE;
  v_current_dow INT;
  v_days_until INT;
  v_scheduled_time TIME;
  v_margin INTERVAL := INTERVAL '1 minute';
BEGIN
  -- Converter para o timezone local
  v_local_time := p_from_time AT TIME ZONE p_timezone;
  v_scheduled_time := MAKE_TIME(p_hour, 0, 0);

  CASE p_frequency
    WHEN 'daily' THEN
      -- Próximo dia no horário especificado
      v_target_date := v_local_time::DATE;
      -- Adicionar margem de 1 minuto para evitar race condition
      -- Se estiver dentro de 1 minuto APÓS o horário, ainda considera "hoje"
      IF v_local_time::TIME >= (v_scheduled_time + v_margin) THEN
        v_target_date := v_target_date + 1;
      END IF;
      v_next := (v_target_date || ' ' || LPAD(p_hour::TEXT, 2, '0') || ':00:00')::TIMESTAMP AT TIME ZONE p_timezone;

    WHEN 'weekly' THEN
      -- Próxima ocorrência do dia da semana especificado
      v_current_dow := EXTRACT(DOW FROM v_local_time)::INT;
      v_days_until := p_day_of_week - v_current_dow;
      -- Adicionar margem de 1 minuto
      IF v_days_until < 0 OR (v_days_until = 0 AND v_local_time::TIME >= (v_scheduled_time + v_margin)) THEN
        v_days_until := v_days_until + 7;
      END IF;
      v_target_date := v_local_time::DATE + v_days_until;
      v_next := (v_target_date || ' ' || LPAD(p_hour::TEXT, 2, '0') || ':00:00')::TIMESTAMP AT TIME ZONE p_timezone;

    WHEN 'monthly' THEN
      -- Próxima ocorrência do dia do mês especificado
      v_target_date := DATE_TRUNC('month', v_local_time::DATE) + (p_day_of_month - 1) * INTERVAL '1 day';
      -- Se o dia já passou este mês (com margem de 1 minuto)
      IF v_target_date < v_local_time::DATE OR
         (v_target_date = v_local_time::DATE AND v_local_time::TIME >= (v_scheduled_time + v_margin)) THEN
        v_target_date := DATE_TRUNC('month', v_local_time::DATE + INTERVAL '1 month') + (p_day_of_month - 1) * INTERVAL '1 day';
      END IF;
      -- Ajustar para meses com menos dias
      IF EXTRACT(DAY FROM v_target_date) != p_day_of_month THEN
        v_target_date := DATE_TRUNC('month', v_target_date) + INTERVAL '1 month' - INTERVAL '1 day';
      END IF;
      v_next := (v_target_date || ' ' || LPAD(p_hour::TEXT, 2, '0') || ':00:00')::TIMESTAMP AT TIME ZONE p_timezone;
  END CASE;

  -- Safety check: se o resultado está no passado, adicionar 1 período
  -- Isso pode acontecer quando a auditoria roda dentro da margem de tolerância
  IF v_next <= p_from_time THEN
    CASE p_frequency
      WHEN 'daily' THEN v_next := v_next + INTERVAL '1 day';
      WHEN 'weekly' THEN v_next := v_next + INTERVAL '7 days';
      WHEN 'monthly' THEN v_next := v_next + INTERVAL '1 month';
    END CASE;
  END IF;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comentário explicando a mudança
COMMENT ON FUNCTION calculate_next_scheduled_audit IS
'Calcula o próximo horário de execução de auditoria agendada.
Inclui margem de 1 minuto para evitar race condition quando
o projeto é atualizado exatamente no horário do agendamento.';

-- ============================================
-- FIX #2: Trigger mais confiável
-- ============================================
-- O trigger original usava UPDATE OF que pode não disparar
-- de forma confiável com Supabase (otimizações do driver).
-- Nova abordagem: usar WHEN clause para garantir que dispara
-- sempre que as configurações de agendamento mudam.

DROP TRIGGER IF EXISTS trg_update_next_scheduled_audit ON projects;

CREATE OR REPLACE FUNCTION update_next_scheduled_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Sempre recalcular quando schedule_enabled é TRUE
  IF NEW.schedule_enabled THEN
    NEW.next_scheduled_audit_at := calculate_next_scheduled_audit(
      NEW.schedule_frequency,
      NEW.schedule_day_of_week,
      NEW.schedule_day_of_month,
      NEW.schedule_hour,
      NEW.schedule_timezone
    );
  ELSE
    NEW.next_scheduled_audit_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que dispara em qualquer INSERT/UPDATE quando as configs mudam
CREATE TRIGGER trg_update_next_scheduled_audit
  BEFORE INSERT OR UPDATE
  ON projects
  FOR EACH ROW
  WHEN (
    -- Dispara no INSERT
    (TG_OP = 'INSERT') OR
    -- Ou quando qualquer campo de agendamento muda
    (OLD.schedule_enabled IS DISTINCT FROM NEW.schedule_enabled) OR
    (OLD.schedule_frequency IS DISTINCT FROM NEW.schedule_frequency) OR
    (OLD.schedule_day_of_week IS DISTINCT FROM NEW.schedule_day_of_week) OR
    (OLD.schedule_day_of_month IS DISTINCT FROM NEW.schedule_day_of_month) OR
    (OLD.schedule_hour IS DISTINCT FROM NEW.schedule_hour) OR
    (OLD.schedule_timezone IS DISTINCT FROM NEW.schedule_timezone)
  )
  EXECUTE FUNCTION update_next_scheduled_audit();
