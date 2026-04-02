-- Migration 018: Adiciona colunas `name` e `valuation_factor` na tabela unit_types
-- Objetivo: suportar os campos "Nome" e "Fator de valorização (x)" nas Tipologias

ALTER TABLE `unit_types`
  ADD COLUMN `name` VARCHAR(100) NULL AFTER `id`,
  ADD COLUMN `valuation_factor` DECIMAL(10,4) NULL DEFAULT NULL AFTER `area`;

-- Índices auxiliares para buscas por name e combinação name+area
CREATE INDEX `idx_unit_types_name` ON `unit_types` (`name`);
CREATE INDEX `idx_unit_types_name_area` ON `unit_types` (`name`, `area`);
