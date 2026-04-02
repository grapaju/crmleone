-- Ensure initial_unit_start exists and is VARCHAR(16) to preserve zeros à esquerda
-- Applies to both Portuguese (torres) and English (towers) schemas

-- Create columns if missing (MySQL 8+/MariaDB syntax)
ALTER TABLE `torres`
  ADD COLUMN IF NOT EXISTS `initial_floor` INT NULL DEFAULT NULL AFTER `unidades_por_andar`,
  ADD COLUMN IF NOT EXISTS `initial_unit_start` VARCHAR(16) NULL DEFAULT NULL AFTER `initial_floor`;

ALTER TABLE `towers`
  ADD COLUMN IF NOT EXISTS `initial_floor` INT NULL DEFAULT NULL AFTER `units_per_floor`,
  ADD COLUMN IF NOT EXISTS `initial_unit_start` VARCHAR(16) NULL DEFAULT NULL AFTER `initial_floor`;

-- Normalize type to VARCHAR(16) (preserva valores como "0601")
-- If column already exists as INT, this will convert it.
ALTER TABLE `torres`
  MODIFY COLUMN `initial_unit_start` VARCHAR(16) NULL DEFAULT NULL;

ALTER TABLE `towers`
  MODIFY COLUMN `initial_unit_start` VARCHAR(16) NULL DEFAULT NULL;
