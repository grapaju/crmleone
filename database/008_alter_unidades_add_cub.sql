-- Migração: adiciona colunas relacionadas ao CUB e garante area_total
-- Execute esta migração após certificar-se de ter backup.

-- Use cada bloco condicionalmente conforme necessidade. Remova linhas já existentes para evitar erros.

-- Adiciona area_total (se ainda não existir)
ALTER TABLE `unidades` ADD COLUMN `area_total` DECIMAL(10,2) NULL AFTER `area_privativa`;
-- Adiciona cub_referencia
ALTER TABLE `unidades` ADD COLUMN `cub_referencia` DECIMAL(10,2) NULL AFTER `valor`;
-- Adiciona id_cub_atual
ALTER TABLE `unidades` ADD COLUMN `id_cub_atual` INT NULL AFTER `cub_referencia`;
-- Adiciona valor_atualizado
ALTER TABLE `unidades` ADD COLUMN `valor_atualizado` DECIMAL(15,2) NULL AFTER `id_cub_atual`;

-- Caso alguma coluna já exista, execute SHOW COLUMNS e comente a linha correspondente antes de rodar novamente.
