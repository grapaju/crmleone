-- Migration 009: adiciona colunas de dormitorios / vagas e ajusta tipos CUB se necessário
-- Execute com cautela em produção (faça backup antes)

-- Adiciona dormitorios (se não existir) na tabela portugues 'unidades'
-- MySQL não suporta ADD COLUMN IF NOT EXISTS em versões antigas; usar checagem dinâmica.
-- Dormitorios
SET @col_exists := (
		SELECT COUNT(*) FROM information_schema.COLUMNS 
		WHERE TABLE_SCHEMA = DATABASE() 
			AND TABLE_NAME = 'unidades' 
			AND COLUMN_NAME = 'dormitorios'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `unidades` ADD COLUMN `dormitorios` INT NULL AFTER `area_total`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Vagas
SET @col_exists2 := (
		SELECT COUNT(*) FROM information_schema.COLUMNS 
		WHERE TABLE_SCHEMA = DATABASE() 
			AND TABLE_NAME = 'unidades' 
			AND COLUMN_NAME = 'vagas'
);
SET @sql2 := IF(@col_exists2 = 0, 'ALTER TABLE `unidades` ADD COLUMN `vagas` INT NULL AFTER `dormitorios`', 'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Para a tabela inglesa 'units': garantir colunas bedrooms / parking já existem normalmente.
-- Caso precise alinhar valor_atualizado para DECIMAL (se for DATE por engano):
-- Atenção: MySQL não aceita ALTER direto de DATE para DECIMAL sem conversão; avaliar antes.
-- Exemplo sugerido (descomente se necessário e confirme tipo atual):
-- ALTER TABLE `units` MODIFY COLUMN `valor_atualizado` DECIMAL(15,2) NULL;

-- Se desejar alinhar nomes CUB para inglês, poderia adicionar colunas equivalentes, mas o modelo já trata ambos.

-- Fim da migration 009
