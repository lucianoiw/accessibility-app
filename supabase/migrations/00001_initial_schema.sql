-- ============================================
-- ACCESSIBILITY AUDIT PLATFORM - INITIAL SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE plan_type AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE audit_status AS ENUM (
  'PENDING',      -- Aguardando início
  'CRAWLING',     -- Descobrindo URLs
  'AUDITING',     -- Executando axe-core
  'AGGREGATING',  -- Agrupando resultados
  'GENERATING',   -- Gerando sugestões IA
  'COMPLETED',    -- Finalizado
  'FAILED',       -- Falhou
  'CANCELLED'     -- Cancelado pelo usuário
);
CREATE TYPE page_found_via AS ENUM ('SITEMAP', 'CRAWL', 'MANUAL');
CREATE TYPE page_audit_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');
CREATE TYPE impact_level AS ENUM ('critical', 'serious', 'moderate', 'minor');
CREATE TYPE export_format AS ENUM ('MARKDOWN', 'PDF', 'CSV', 'JSON', 'JIRA');

-- ============================================
-- PROFILES (extends Supabase Auth)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan plan_type DEFAULT 'FREE',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  description TEXT,

  -- Configurações padrão para auditorias
  default_max_pages INT DEFAULT 100,
  default_wcag_levels TEXT[] DEFAULT ARRAY['A', 'AA'],
  default_include_abnt BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);

-- ============================================
-- PAGES (URLs descobertas)
-- ============================================

CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  path TEXT NOT NULL,  -- /about, /contact, etc.
  title TEXT,
  found_via page_found_via DEFAULT 'CRAWL',
  depth INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, url)
);

CREATE INDEX idx_pages_project_id ON pages(project_id);

-- ============================================
-- AUDITS
-- ============================================

CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status audit_status DEFAULT 'PENDING',

  -- Configurações desta auditoria
  max_pages INT DEFAULT 100,
  wcag_levels TEXT[] DEFAULT ARRAY['A', 'AA'],
  include_abnt BOOLEAN DEFAULT TRUE,

  -- Progresso
  total_pages INT DEFAULT 0,
  processed_pages INT DEFAULT 0,
  failed_pages INT DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Resultado agregado (cache)
  summary JSONB,  -- { critical: 0, serious: 42, moderate: 1, minor: 0, total: 43 }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audits_project_id ON audits(project_id);
CREATE INDEX idx_audits_status ON audits(status);

-- ============================================
-- AUDIT_PAGES (junção Audit <-> Page)
-- ============================================

CREATE TABLE audit_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  status page_audit_status DEFAULT 'PENDING',

  -- Resultados
  screenshot_url TEXT,
  raw_results JSONB,  -- Resultado bruto do axe-core
  error_message TEXT,

  -- Métricas
  violation_count INT DEFAULT 0,
  load_time INT,  -- ms

  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(audit_id, page_id)
);

CREATE INDEX idx_audit_pages_audit_id ON audit_pages(audit_id);
CREATE INDEX idx_audit_pages_status ON audit_pages(status);

-- ============================================
-- VIOLATIONS (problemas individuais)
-- ============================================

CREATE TABLE violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  audit_page_id UUID NOT NULL REFERENCES audit_pages(id) ON DELETE CASCADE,

  -- Identificação da regra
  rule_id TEXT NOT NULL,  -- ex: "color-contrast", "link-texto-generico"
  is_custom_rule BOOLEAN DEFAULT FALSE,

  -- Impacto
  impact impact_level NOT NULL,

  -- WCAG info
  wcag_level TEXT,        -- "A", "AA", "AAA"
  wcag_version TEXT,      -- "2.0", "2.1", "2.2"
  wcag_criteria TEXT[],   -- ["1.4.3", "1.4.6"]
  wcag_tags TEXT[],       -- ["wcag2aa", "wcag21aa", "cat.color"]

  -- ABNT info
  abnt_section TEXT,      -- "ABNT 5.11.3"

  -- Descrição
  help TEXT NOT NULL,
  description TEXT NOT NULL,
  help_url TEXT,

  -- Elemento afetado
  selector TEXT NOT NULL,
  html TEXT NOT NULL,
  parent_html TEXT,

  -- Dados técnicos
  failure_summary TEXT,
  technical_data JSONB,

  -- Para agregação
  fingerprint TEXT NOT NULL,  -- Hash: ruleId + selector normalizado

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_violations_audit_id ON violations(audit_id);
CREATE INDEX idx_violations_audit_page_id ON violations(audit_page_id);
CREATE INDEX idx_violations_rule_id ON violations(rule_id);
CREATE INDEX idx_violations_fingerprint ON violations(fingerprint);
CREATE INDEX idx_violations_impact ON violations(impact);

-- ============================================
-- AGGREGATED_VIOLATIONS (problemas agrupados)
-- ============================================

CREATE TABLE aggregated_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,

  -- Identificação
  rule_id TEXT NOT NULL,
  is_custom_rule BOOLEAN DEFAULT FALSE,
  fingerprint TEXT NOT NULL,

  -- Impacto
  impact impact_level NOT NULL,

  -- WCAG/ABNT
  wcag_level TEXT,
  wcag_version TEXT,
  wcag_criteria TEXT[],
  abnt_section TEXT,

  -- Descrição
  help TEXT NOT NULL,
  description TEXT NOT NULL,
  help_url TEXT,

  -- Estatísticas
  occurrences INT NOT NULL,     -- Total de ocorrências
  page_count INT NOT NULL,      -- Quantas páginas afetadas
  affected_pages TEXT[],        -- Lista de URLs (limitado a 50)

  -- Exemplo representativo
  sample_selector TEXT NOT NULL,
  sample_html TEXT NOT NULL,
  sample_parent_html TEXT,
  sample_page_url TEXT NOT NULL,

  -- Sugestão de correção (IA)
  ai_suggestion TEXT,
  ai_suggested_html TEXT,
  ai_generated_at TIMESTAMPTZ,

  -- Prioridade calculada (0-100, maior = mais urgente)
  priority INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(audit_id, fingerprint)
);

CREATE INDEX idx_aggregated_violations_audit_id ON aggregated_violations(audit_id);
CREATE INDEX idx_aggregated_violations_impact ON aggregated_violations(impact);
CREATE INDEX idx_aggregated_violations_priority ON aggregated_violations(priority);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_violations ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário só vê seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects: usuário só vê seus próprios projetos
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Pages: acesso via project ownership
CREATE POLICY "Users can view pages of own projects" ON pages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert pages to own projects" ON pages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
  );

-- Audits: acesso via project ownership
CREATE POLICY "Users can view audits of own projects" ON audits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = audits.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert audits to own projects" ON audits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = audits.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update audits of own projects" ON audits
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = audits.project_id AND projects.user_id = auth.uid())
  );

-- Audit Pages: acesso via audit -> project ownership
CREATE POLICY "Users can view audit_pages of own audits" ON audit_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audits
      JOIN projects ON projects.id = audits.project_id
      WHERE audits.id = audit_pages.audit_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audit_pages to own audits" ON audit_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM audits
      JOIN projects ON projects.id = audits.project_id
      WHERE audits.id = audit_pages.audit_id AND projects.user_id = auth.uid()
    )
  );

-- Violations: acesso via audit -> project ownership
CREATE POLICY "Users can view violations of own audits" ON violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audits
      JOIN projects ON projects.id = audits.project_id
      WHERE audits.id = violations.audit_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert violations to own audits" ON violations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM audits
      JOIN projects ON projects.id = audits.project_id
      WHERE audits.id = violations.audit_id AND projects.user_id = auth.uid()
    )
  );

-- Aggregated Violations: acesso via audit -> project ownership
CREATE POLICY "Users can view aggregated_violations of own audits" ON aggregated_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audits
      JOIN projects ON projects.id = audits.project_id
      WHERE audits.id = aggregated_violations.audit_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert aggregated_violations to own audits" ON aggregated_violations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM audits
      JOIN projects ON projects.id = audits.project_id
      WHERE audits.id = aggregated_violations.audit_id AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Trigger para criar profile automaticamente após signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audits_updated_at
  BEFORE UPDATE ON audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aggregated_violations_updated_at
  BEFORE UPDATE ON aggregated_violations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
