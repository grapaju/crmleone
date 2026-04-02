-- Migration 014: adiciona campos de pavimentos-tipo e diferenciados nas tabelas de torres
-- Execute somente uma vez. Ajuste conforme o seu schema (torres ou towers).

-- Se usar tabela em português (torres):
ALTER TABLE `torres`
  ADD COLUMN `typical_floors_start` INT NULL AFTER `initial_unit_start`;
ALTER TABLE `torres`
  ADD COLUMN `typical_floors_end` INT NULL AFTER `typical_floors_start`;
ALTER TABLE `torres`
  ADD COLUMN `has_ground` TINYINT(1) NOT NULL DEFAULT 0 AFTER `typical_floors_end`;
ALTER TABLE `torres`
  ADD COLUMN `has_penthouse` TINYINT(1) NOT NULL DEFAULT 0 AFTER `has_ground`;
ALTER TABLE `torres`
  ADD COLUMN `has_mezzanine` TINYINT(1) NOT NULL DEFAULT 0 AFTER `has_penthouse`;

-- Se usar tabela em inglês (towers), descomente os comandos abaixo:
-- ALTER TABLE `towers`
--   ADD COLUMN `typical_floors_start` INT NULL AFTER `initial_unit_start`;
-- ALTER TABLE `towers`
--   ADD COLUMN `typical_floors_end` INT NULL AFTER `typical_floors_start`;
-- ALTER TABLE `towers`
--   ADD COLUMN `has_ground` TINYINT(1) NOT NULL DEFAULT 0 AFTER `typical_floors_end`;
-- ALTER TABLE `towers`
--   ADD COLUMN `has_penthouse` TINYINT(1) NOT NULL DEFAULT 0 AFTER `has_ground`;
-- ALTER TABLE `towers`
--   ADD COLUMN `has_mezzanine` TINYINT(1) NOT NULL DEFAULT 0 AFTER `has_penthouse`;
