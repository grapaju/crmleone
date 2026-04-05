BEGIN;

-- PostgreSQL schema for CRM Imoveis API
-- Generated from current API usage and MySQL schema baseline.

-- ---------- Helpers ----------
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- Core tables ----------
CREATE TABLE IF NOT EXISTS agents (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  document VARCHAR(30),
  role VARCHAR(50) NOT NULL DEFAULT 'agent',
  password VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS imobiliarias (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS features (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(200) NOT NULL,
  CONSTRAINT uq_features_category_name UNIQUE (category, name)
);

-- Optional compatibility table in pt-BR naming
CREATE TABLE IF NOT EXISTS caracteristicas (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  categoria VARCHAR(200) NOT NULL,
  CONSTRAINT uq_caracteristicas_categoria_nome UNIQUE (categoria, nome)
);

CREATE TABLE IF NOT EXISTS tips (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  description VARCHAR(255) NOT NULL,
  canal VARCHAR(20) DEFAULT 'outro',
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT,
  price NUMERIC(10,2) NOT NULL,
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking INTEGER,
  area NUMERIC(10,2),
  type VARCHAR(100),
  status VARCHAR(50),
  property_type VARCHAR(50),
  agent_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_properties_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);

CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  property_type VARCHAR(50) NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  developer_name VARCHAR(255) NOT NULL,
  project_type VARCHAR(100),
  project_status VARCHAR(50),
  endereco VARCHAR(200) NOT NULL,
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  delivery_date DATE,
  image VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_property_type ON projects(property_type);

CREATE TABLE IF NOT EXISTS unit_types (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100),
  position VARCHAR(100) NOT NULL,
  parking_spots INTEGER DEFAULT 0,
  bedrooms VARCHAR(50),
  area NUMERIC(10,2) NOT NULL,
  valuation_factor NUMERIC(10,4),
  base_price NUMERIC(15,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_unit_types_position UNIQUE (position)
);

CREATE INDEX IF NOT EXISTS idx_unit_types_name ON unit_types(name);
CREATE INDEX IF NOT EXISTS idx_unit_types_name_area ON unit_types(name, area);

CREATE TABLE IF NOT EXISTS towers (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(100),
  floors INTEGER,
  units_per_floor INTEGER,
  initial_floor INTEGER,
  initial_unit_start VARCHAR(16),
  typical_floors_start INTEGER,
  typical_floors_end INTEGER,
  has_ground BOOLEAN NOT NULL DEFAULT FALSE,
  has_penthouse BOOLEAN NOT NULL DEFAULT FALSE,
  has_mezzanine BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_towers_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_towers_project_id ON towers(project_id);

CREATE TABLE IF NOT EXISTS units (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL,
  tower_id BIGINT,
  unit_type_id BIGINT,
  unit_number VARCHAR(50),
  floor INTEGER,
  area_privativa NUMERIC(10,2),
  area_total NUMERIC(10,2),
  floor_factor NUMERIC(10,4),
  dormitorios INTEGER,
  vagas INTEGER,
  sale_status VARCHAR(50) DEFAULT 'disponivel',
  specific_features TEXT,
  cub_referencia NUMERIC(10,2),
  id_cub_atual BIGINT,
  valor_atualizado NUMERIC(15,2),
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_units_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_units_tower FOREIGN KEY (tower_id) REFERENCES towers(id) ON DELETE SET NULL,
  CONSTRAINT fk_units_unit_type FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_units_project_id ON units(project_id);
CREATE INDEX IF NOT EXISTS idx_units_tower_id ON units(tower_id);
CREATE INDEX IF NOT EXISTS idx_units_unit_type_id ON units(unit_type_id);

CREATE TABLE IF NOT EXISTS cub (
  id BIGSERIAL PRIMARY KEY,
  valoratual NUMERIC(10,2) NOT NULL,
  vigencia DATE NOT NULL,
  variacao NUMERIC(10,3),
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_cub_vigencia UNIQUE (vigencia)
);

CREATE INDEX IF NOT EXISTS idx_cub_vigencia ON cub(vigencia);

CREATE TABLE IF NOT EXISTS unit_cub_history (
  id BIGSERIAL PRIMARY KEY,
  unit_id BIGINT NOT NULL,
  cub_id BIGINT,
  cub_valor NUMERIC(10,2),
  old_cub_referencia NUMERIC(10,2),
  old_id_cub_atual BIGINT,
  old_valor_atualizado NUMERIC(15,2),
  new_cub_referencia NUMERIC(10,2),
  new_id_cub_atual BIGINT,
  new_valor_atualizado NUMERIC(15,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_unit_cub_history_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  CONSTRAINT fk_unit_cub_history_cub FOREIGN KEY (cub_id) REFERENCES cub(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_unit_cub_history_unit_id ON unit_cub_history(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_cub_history_cub_id ON unit_cub_history(cub_id);

CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  source VARCHAR(100),
  interest VARCHAR(200) NOT NULL,
  budget NUMERIC(10,2) NOT NULL,
  location VARCHAR(200) NOT NULL,
  notes VARCHAR(200) NOT NULL,
  status VARCHAR(50),
  score INTEGER DEFAULT 0,
  agent_id BIGINT,
  propertie_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leads_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);

CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  start TIMESTAMP,
  "end" TIMESTAMP,
  agent_id BIGINT,
  lead_id BIGINT,
  property_id BIGINT,
  project_id BIGINT,
  status VARCHAR(50) NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointments_agent_id ON appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_property_id ON appointments(property_id);

CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  type VARCHAR(30) DEFAULT 'corretor',
  imobiliaria_id BIGINT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contacts_imobiliaria FOREIGN KEY (imobiliaria_id) REFERENCES imobiliarias(id)
);

-- Compatibility view for legacy migration script
DROP VIEW IF EXISTS contatos;
CREATE VIEW contatos AS
SELECT id, name AS nome, email
FROM contacts;

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  property_id BIGINT,
  expirydate DATE,
  status VARCHAR(50),
  uploaded_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_documents_property FOREIGN KEY (property_id) REFERENCES properties(id),
  CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_property_id ON documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

CREATE TABLE IF NOT EXISTS history (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  channel VARCHAR(100) NOT NULL,
  recipients VARCHAR(255) NOT NULL,
  "type" VARCHAR(50),
  status VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_table_id_date ON history(table_id, date DESC);

CREATE TABLE IF NOT EXISTS lead_activities (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(150),
  description TEXT,
  channel VARCHAR(50),
  table_id BIGINT,
  appointment_id BIGINT,
  status VARCHAR(50),
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  agent_id BIGINT,
  property_id BIGINT,
  project_id BIGINT,
  CONSTRAINT fk_lead_activities_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_activities_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_activities_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_activities_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_activities_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_created ON lead_activities(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_tips (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL,
  tip_id BIGINT NOT NULL,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_tips_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_tips_tip FOREIGN KEY (tip_id) REFERENCES tips(id) ON DELETE CASCADE,
  CONSTRAINT uq_lead_tips UNIQUE (lead_id, tip_id)
);

CREATE TABLE IF NOT EXISTS project_features (
  project_id BIGINT NOT NULL,
  feature_id BIGINT NOT NULL,
  PRIMARY KEY (project_id, feature_id),
  CONSTRAINT fk_project_features_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_features_feature FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS property_features (
  property_id BIGINT NOT NULL,
  feature_id BIGINT NOT NULL,
  PRIMARY KEY (property_id, feature_id),
  CONSTRAINT fk_property_features_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_property_features_feature FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS property_images (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT,
  project_id BIGINT,
  unit_id BIGINT,
  image_url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_property_images_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_property_images_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_property_images_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_project_id ON property_images(project_id);
CREATE INDEX IF NOT EXISTS idx_property_images_unit_id ON property_images(unit_id);

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  content TEXT,
  created_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_created_by FOREIGN KEY (created_by) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS sales_tables (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  observations TEXT,
  project_id BIGINT,
  attachments TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_tables_project FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_tables_project_id ON sales_tables(project_id);

CREATE TABLE IF NOT EXISTS automations (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200),
  message TEXT,
  table_id BIGINT NOT NULL,
  dia_mes VARCHAR(5) NOT NULL,
  hora_envio TIME,
  recipients TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  CONSTRAINT fk_automations_sales_table FOREIGN KEY (table_id) REFERENCES sales_tables(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_automations_table_id ON automations(table_id);

CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuracoes (
  id BIGSERIAL PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT,
  project_id BIGINT,
  type VARCHAR(100),
  description TEXT,
  agent_id BIGINT,
  CONSTRAINT fk_activities_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_activities_property FOREIGN KEY (property_id) REFERENCES properties(id),
  CONSTRAINT fk_activities_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS agent_property_access (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT NOT NULL,
  property_id BIGINT NOT NULL,
  can_edit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_agent_property UNIQUE (agent_id, property_id),
  CONSTRAINT fk_agent_property_access_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_property_access_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_property_access_agent ON agent_property_access(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_property_access_property ON agent_property_access(property_id);

CREATE TABLE IF NOT EXISTS agent_project_access (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  can_edit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_agent_project UNIQUE (agent_id, project_id),
  CONSTRAINT fk_agent_project_access_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_project_access_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_unit_access (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT NOT NULL,
  unit_id BIGINT NOT NULL,
  can_edit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_agent_unit UNIQUE (agent_id, unit_id),
  CONSTRAINT fk_agent_unit_access_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_unit_access_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- Legacy model compatibility
CREATE TABLE IF NOT EXISTS construction_projects (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget NUMERIC(15,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Updated-at triggers ----------
DROP TRIGGER IF EXISTS trg_agents_updated_at ON agents;
CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON agents
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON contacts;
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_lead_tips_updated_at ON lead_tips;
CREATE TRIGGER trg_lead_tips_updated_at BEFORE UPDATE ON lead_tips
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_properties_updated_at ON properties;
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_tables_updated_at ON sales_tables;
CREATE TRIGGER trg_sales_tables_updated_at BEFORE UPDATE ON sales_tables
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_configuracoes_updated_at ON configuracoes;
CREATE TRIGGER trg_configuracoes_updated_at BEFORE UPDATE ON configuracoes
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_tips_updated_at ON tips;
CREATE TRIGGER trg_tips_updated_at BEFORE UPDATE ON tips
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_unit_types_updated_at ON unit_types;
CREATE TRIGGER trg_unit_types_updated_at BEFORE UPDATE ON unit_types
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_construction_projects_updated_at ON construction_projects;
CREATE TRIGGER trg_construction_projects_updated_at BEFORE UPDATE ON construction_projects
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_cub_updated_at ON cub;
CREATE TRIGGER trg_cub_updated_at BEFORE UPDATE ON cub
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ---------- Appointment to lead_activities triggers ----------
CREATE OR REPLACE FUNCTION trg_appointments_insert_to_lead_activities()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_activities (
    lead_id,
    type,
    title,
    description,
    channel,
    table_id,
    appointment_id,
    status,
    date,
    created_at,
    agent_id,
    property_id,
    project_id
  ) VALUES (
    NEW.lead_id,
    NEW.type,
    NEW.title,
    NEW.description,
    NULL,
    NEW.id,
    NEW.id,
    NEW.status,
    NEW.start,
    CURRENT_TIMESTAMP,
    NEW.agent_id,
    NEW.property_id,
    NEW.project_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointments_insert_to_lead_activities ON appointments;
CREATE TRIGGER trg_appointments_insert_to_lead_activities
AFTER INSERT ON appointments
FOR EACH ROW EXECUTE FUNCTION trg_appointments_insert_to_lead_activities();

CREATE OR REPLACE FUNCTION trg_appointments_update_status_to_lead_activities()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO lead_activities (
      lead_id,
      type,
      title,
      description,
      channel,
      table_id,
      appointment_id,
      status,
      date,
      created_at,
      agent_id,
      property_id,
      project_id
    ) VALUES (
      NEW.lead_id,
      NEW.type,
      COALESCE(NEW.title, '') || ' - Status alterado',
      NEW.description,
      NULL,
      NEW.id,
      NEW.id,
      NEW.status,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      NEW.agent_id,
      NEW.property_id,
      NEW.project_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointments_update_status_to_lead_activities ON appointments;
CREATE TRIGGER trg_appointments_update_status_to_lead_activities
AFTER UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION trg_appointments_update_status_to_lead_activities();

COMMIT;
