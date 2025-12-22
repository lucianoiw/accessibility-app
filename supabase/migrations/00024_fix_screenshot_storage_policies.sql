-- =====================================================
-- Fix: Configurar bucket para screenshots
-- NOTA: As políticas de storage.objects devem ser criadas
-- via Supabase Dashboard > Storage > Policies
-- (veja scripts/storage-policies.sql para o SQL)
-- =====================================================

-- Criar bucket para screenshots (idempotente - não falha se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'screenshots'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'screenshots',
      'screenshots',
      true,                    -- Bucket público para leitura
      10485760,               -- 10MB limite por arquivo
      ARRAY['image/png']      -- Apenas PNG permitido
    );
    RAISE NOTICE 'Bucket screenshots criado com sucesso';
  ELSE
    -- Atualizar configurações do bucket existente
    UPDATE storage.buckets
    SET
      public = true,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/png']
    WHERE id = 'screenshots';
    RAISE NOTICE 'Bucket screenshots atualizado';
  END IF;
END $$;
