-- Migration 013: adiciona coluna floor_factor para cálculo de valor baseado em fator do andar
-- Execute somente uma vez. Verifica existência antes para evitar erro.

ALTER TABLE `unidades` ADD COLUMN `floor_factor` DECIMAL(10,4) NULL AFTER `area_total`;
-- Se usar tabela 'units' (ingles), descomente a linha abaixo:
-- ALTER TABLE `units` ADD COLUMN `floor_factor` DECIMAL(10,4) NULL AFTER `area_total`;

-- Caso já exista, comente a linha correspondente.
