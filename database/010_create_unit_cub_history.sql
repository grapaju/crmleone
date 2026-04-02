-- Migration 010: histórico de atualizações de CUB nas unidades
-- Cria tabela para registrar cada recálculo de valor_atualizado
-- Execute após garantir que tabela de unidades (unidades ou units) já existe.

CREATE TABLE IF NOT EXISTS `unit_cub_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `unit_id` INT NOT NULL,
  `cub_id` INT NULL,
  `cub_valor` DECIMAL(10,2) NULL,
  `old_cub_referencia` DECIMAL(10,2) NULL,
  `old_id_cub_atual` INT NULL,
  `old_valor_atualizado` DECIMAL(15,2) NULL,
  `new_cub_referencia` DECIMAL(10,2) NULL,
  `new_id_cub_atual` INT NULL,
  `new_valor_atualizado` DECIMAL(15,2) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`unit_id`),
  INDEX (`cub_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
