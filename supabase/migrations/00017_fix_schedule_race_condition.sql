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

  RETURN v_next;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comentário explicando a mudança
COMMENT ON FUNCTION calculate_next_scheduled_audit IS
'Calcula o próximo horário de execução de auditoria agendada.
Inclui margem de 1 minuto para evitar race condition quando
o projeto é atualizado exatamente no horário do agendamento.';
