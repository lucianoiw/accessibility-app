-- =====================================================
-- Storage Policies para bucket 'screenshots'
--
-- COMO USAR:
-- 1. Acesse Supabase Dashboard > SQL Editor
-- 2. Cole este script e execute
--
-- OU via Dashboard UI:
-- 1. Acesse Storage > screenshots > Policies
-- 2. Crie as 3 policies manualmente (ver abaixo)
-- =====================================================

-- Remover políticas antigas (se existirem) para recriar
DROP POLICY IF EXISTS "Public read access for screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete screenshots" ON storage.objects;

-- Policy 1: Leitura pública
-- Permite qualquer pessoa visualizar screenshots
CREATE POLICY "Public read access for screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'screenshots');

-- Policy 2: Upload via service_role
-- Permite Trigger.dev fazer upload de screenshots
-- Valida que o path segue o formato UUID/UUID.png
CREATE POLICY "Service role can upload screenshots"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'screenshots'
  AND (storage.foldername(name))[1] ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
);

-- Policy 3: Delete via service_role
-- Permite limpar screenshots ao deletar auditorias
CREATE POLICY "Service role can delete screenshots"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'screenshots');

-- =====================================================
-- ALTERNATIVA: Criar via Dashboard UI
-- =====================================================
--
-- Policy 1 - "Public read access for screenshots"
--   Operation: SELECT
--   Target roles: public (anon, authenticated)
--   USING expression: bucket_id = 'screenshots'
--
-- Policy 2 - "Service role can upload screenshots"
--   Operation: INSERT
--   Target roles: service_role
--   WITH CHECK expression:
--     bucket_id = 'screenshots' AND
--     (storage.foldername(name))[1] ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
--
-- Policy 3 - "Service role can delete screenshots"
--   Operation: DELETE
--   Target roles: service_role
--   USING expression: bucket_id = 'screenshots'
-- =====================================================
