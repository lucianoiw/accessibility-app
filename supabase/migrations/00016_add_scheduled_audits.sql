-- ============================================
-- AGENDAMENTO DE AUDITORIAS
-- ============================================

-- Tipo enum para frequência de agendamento
CREATE TYPE schedule_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- Adicionar campos de agendamento na tabela projects
ALTER TABLE projects
  ADD COLUMN schedule_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN schedule_frequency schedule_frequency DEFAULT 'weekly',
  ADD COLUMN schedule_day_of_week INT DEFAULT 1 CHECK (schedule_day_of_week >= 0 AND schedule_day_of_week <= 6),
  ADD COLUMN schedule_day_of_month INT DEFAULT 1 CHECK (schedule_day_of_month >= 1 AND schedule_day_of_month <= 31),
  ADD COLUMN schedule_hour INT DEFAULT 9 CHECK (schedule_hour >= 0 AND schedule_hour <= 23),
  ADD COLUMN schedule_timezone TEXT DEFAULT 'America/Sao_Paulo',
  ADD COLUMN last_scheduled_audit_at TIMESTAMPTZ,
  ADD COLUMN next_scheduled_audit_at TIMESTAMPTZ;

-- Comentários explicativos
COMMENT ON COLUMN projects.schedule_enabled IS 'Se o agendamento automático está ativo';
COMMENT ON COLUMN projects.schedule_frequency IS 'Frequência: daily, weekly, monthly';
COMMENT ON COLUMN projects.schedule_day_of_week IS 'Dia da semana para weekly (0=Dom, 1=Seg, ..., 6=Sab)';
COMMENT ON COLUMN projects.schedule_day_of_month IS 'Dia do mês para monthly (1-31)';
COMMENT ON COLUMN projects.schedule_hour IS 'Hora do dia para executar (0-23, no timezone configurado)';
COMMENT ON COLUMN projects.schedule_timezone IS 'Timezone para o agendamento (ex: America/Sao_Paulo)';
COMMENT ON COLUMN projects.last_scheduled_audit_at IS 'Timestamp da última auditoria agendada';
COMMENT ON COLUMN projects.next_scheduled_audit_at IS 'Timestamp da próxima auditoria agendada';

-- Índice para buscar projetos com agendamento ativo que estão no horário
CREATE INDEX idx_projects_schedule_due
  ON projects(next_scheduled_audit_at)
  WHERE schedule_enabled = TRUE;

-- Adicionar coluna na auditoria para identificar se foi agendada
ALTER TABLE audits
  ADD COLUMN is_scheduled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN audits.is_scheduled IS 'Se a auditoria foi iniciada automaticamente via agendamento';

-- Função para calcular próximo horário de execução
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
BEGIN
  -- Converter para o timezone local
  v_local_time := p_from_time AT TIME ZONE p_timezone;

  CASE p_frequency
    WHEN 'daily' THEN
      -- Próximo dia no horário especificado
      v_target_date := v_local_time::DATE;
      IF v_local_time::TIME >= MAKE_TIME(p_hour, 0, 0) THEN
        v_target_date := v_target_date + 1;
      END IF;
      v_next := (v_target_date || ' ' || LPAD(p_hour::TEXT, 2, '0') || ':00:00')::TIMESTAMP AT TIME ZONE p_timezone;

    WHEN 'weekly' THEN
      -- Próxima ocorrência do dia da semana especificado
      v_current_dow := EXTRACT(DOW FROM v_local_time)::INT;
      v_days_until := p_day_of_week - v_current_dow;
      IF v_days_until < 0 OR (v_days_until = 0 AND v_local_time::TIME >= MAKE_TIME(p_hour, 0, 0)) THEN
        v_days_until := v_days_until + 7;
      END IF;
      v_target_date := v_local_time::DATE + v_days_until;
      v_next := (v_target_date || ' ' || LPAD(p_hour::TEXT, 2, '0') || ':00:00')::TIMESTAMP AT TIME ZONE p_timezone;

    WHEN 'monthly' THEN
      -- Próxima ocorrência do dia do mês especificado
      v_target_date := DATE_TRUNC('month', v_local_time::DATE) + (p_day_of_month - 1) * INTERVAL '1 day';
      -- Se o dia já passou este mês, ir para o próximo mês
      IF v_target_date < v_local_time::DATE OR
         (v_target_date = v_local_time::DATE AND v_local_time::TIME >= MAKE_TIME(p_hour, 0, 0)) THEN
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

-- Trigger para atualizar next_scheduled_audit_at quando configuração muda
CREATE OR REPLACE FUNCTION update_next_scheduled_audit()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE TRIGGER trg_update_next_scheduled_audit
  BEFORE INSERT OR UPDATE OF schedule_enabled, schedule_frequency, schedule_day_of_week, schedule_day_of_month, schedule_hour, schedule_timezone
  ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_next_scheduled_audit();
