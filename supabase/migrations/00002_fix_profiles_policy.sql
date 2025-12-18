-- Fix: Permitir que o trigger insira profiles para novos usuários

-- Opção 1: Policy para insert do próprio usuário
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Opção 2 (alternativa): Permitir service role inserir
-- Isso já funciona com SECURITY DEFINER, mas vamos garantir
-- que a função tenha permissão de bypassar RLS

-- Recriar a função com search_path seguro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garantir que a função pertence ao postgres (para bypassar RLS)
ALTER FUNCTION handle_new_user() OWNER TO postgres;
