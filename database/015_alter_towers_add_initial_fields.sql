-- Adds initial_floor and initial_unit_start to towers tables if they don't exist
-- MySQL 8.0+ syntax for IF NOT EXISTS

ALTER TABLE `torres`
  ADD COLUMN IF NOT EXISTS `initial_floor` INT NULL DEFAULT NULL AFTER `unidades_por_andar`,
  ADD COLUMN IF NOT EXISTS `initial_unit_start` VARCHAR(16) NULL DEFAULT NULL AFTER `initial_floor`;

ALTER TABLE `towers`
  ADD COLUMN IF NOT EXISTS `initial_floor` INT NULL DEFAULT NULL AFTER `units_per_floor`,
  ADD COLUMN IF NOT EXISTS `initial_unit_start` VARCHAR(16) NULL DEFAULT NULL AFTER `initial_floor`;
