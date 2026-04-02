-- Migration 011: Criação da tabela CUB
-- Executar após garantir backup do banco.
-- A tabela armazena o valor mensal do CUB utilizado para reajustar os valores das unidades.
-- Caso já exista tabela semelhante, ajuste os nomes conforme necessário.

CREATE TABLE IF NOT EXISTS `cub` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `valorAtual` DECIMAL(10,2) NOT NULL COMMENT 'Valor do CUB vigente (R$/m²)',
  `vigencia` DATE NOT NULL COMMENT 'Mês de vigência (usar dia 01)',
  `variacao` DECIMAL(6,3) NULL DEFAULT NULL COMMENT 'Variação percentual do mês (%)',
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cub_vigencia` (`vigencia`),
  KEY `idx_cub_vigencia_desc` (`vigencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notas:
-- 1. O endpoint cub.php normaliza vigencia YYYY-MM para YYYY-MM-01.
-- 2. A coluna variacao é opcional; pode registrar % de variação do CUB em relação ao mês anterior.
-- 3. A busca do CUB mais recente usa ORDER BY vigencia DESC, id DESC.
