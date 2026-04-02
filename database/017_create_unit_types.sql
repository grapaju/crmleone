-- Migration 017: Criação da tabela unit_types
-- Tipologias base para mapeamento de finais (pilhas) e reutilização nas unidades
-- Compatível com o endpoint api/php-api-crm/public/unit_types.php

CREATE TABLE
IF NOT EXISTS `unit_types`
(
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `position` VARCHAR
(100) NOT NULL COMMENT 'Rótulo/posição do tipo (ex.: Tipo A, Frente, 2 quartos)',
  `parking_spots` INT NULL DEFAULT 0,
  `bedrooms` VARCHAR
(20) NULL DEFAULT NULL,
  `area` DECIMAL
(10,2) NOT NULL,
  `base_price` DECIMAL
(15,2) NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON
UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY
(`id`),
  KEY `idx_unit_types_position`
(`position`),
  KEY `idx_unit_types_area`
(`area`),
  KEY `idx_unit_types_position_area`
(`position`, `area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
