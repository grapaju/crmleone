BEGIN;

ALTER TABLE IF EXISTS unit_types
  DROP CONSTRAINT IF EXISTS uq_unit_types_position;

CREATE INDEX IF NOT EXISTS idx_unit_types_position ON unit_types(position);

COMMIT;
