-- Migration 019: Corrige trigger da tabela cub no PostgreSQL
-- Problema: trigger genérico usa NEW.updated_at, mas a tabela cub possui coluna atualizado_em.

BEGIN;

CREATE OR REPLACE FUNCTION trg_set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cub_updated_at ON cub;
CREATE TRIGGER trg_cub_updated_at
BEFORE UPDATE ON cub
FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

COMMIT;
