-- Cria tabela `unidades` esperada pelo backend (schema em português)
-- Execute este arquivo no banco `crm_imoveis` (phpMyAdmin ou mysql CLI)

CREATE TABLE IF NOT EXISTS `unidades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `obra_id` int(11) NOT NULL,
  `torre_id` int(11) DEFAULT NULL,
  `numero_unidade` varchar(50) DEFAULT NULL,
  `pavimento` int(11) DEFAULT NULL,
  `tipo` varchar(100) DEFAULT NULL,
  `area_privativa` decimal(10,2) DEFAULT NULL,
  `area_total` decimal(10,2) DEFAULT NULL,
  `status_venda` varchar(50) DEFAULT NULL,
  `valor` decimal(15,2) DEFAULT NULL,
  `caracteristicas_especificas` text,
  PRIMARY KEY (`id`),
  KEY `obra_id` (`obra_id`),
  KEY `torre_id` (`torre_id`),
  CONSTRAINT `unidades_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `unidades_ibfk_2` FOREIGN KEY (`torre_id`) REFERENCES `torres` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
