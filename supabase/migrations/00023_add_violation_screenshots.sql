-- Adicionar campo para URL do screenshot em violacoes agregadas
ALTER TABLE aggregated_violations
ADD COLUMN screenshot_url TEXT;

-- Comentario explicando o campo
COMMENT ON COLUMN aggregated_violations.screenshot_url IS 'URL do screenshot do elemento com problema no Supabase Storage';

-- Criar bucket para screenshots (executar via Dashboard ou API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true);

-- Policy para permitir leitura publica de screenshots
-- (Bucket precisa ser criado primeiro via Dashboard)
-- CREATE POLICY "Public read access for screenshots"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'screenshots');

-- Policy para service role fazer upload (Trigger.dev)
-- CREATE POLICY "Service role can upload screenshots"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'service_role');

-- Policy para service role deletar screenshots
-- CREATE POLICY "Service role can delete screenshots"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'screenshots' AND auth.role() = 'service_role');
