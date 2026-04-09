-- Migration 021 (PostgreSQL): tipologias por empreendimento e por torre
-- Permite persistir e recuperar configuracoes da Etapa 2 do Gerador Inteligente por contexto.

CREATE TABLE IF NOT EXISTS project_tower_unit_types (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL,
  tower_id BIGINT NOT NULL,
  unit_type_id BIGINT,
  name VARCHAR(100),
  position VARCHAR(100) NOT NULL,
  bedrooms VARCHAR(50),
  suites VARCHAR(50),
  parking_spots INTEGER DEFAULT 0,
  area NUMERIC(10,2) NOT NULL,
  valuation_factor NUMERIC(10,4),
  floors_start INTEGER,
  floors_end INTEGER,
  per_floor_quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ptut_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_ptut_tower FOREIGN KEY (tower_id) REFERENCES towers(id) ON DELETE CASCADE,
  CONSTRAINT fk_ptut_unit_type FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ptut_project ON project_tower_unit_types(project_id);
CREATE INDEX IF NOT EXISTS idx_ptut_tower ON project_tower_unit_types(tower_id);
CREATE INDEX IF NOT EXISTS idx_ptut_project_tower ON project_tower_unit_types(project_id, tower_id);
