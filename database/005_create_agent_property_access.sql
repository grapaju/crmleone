-- Migration: cria tabela de permissões de acesso de corretores a propriedades
-- Executar após 004_create_tips_aligned_with_leadsTip.sql

CREATE TABLE IF NOT EXISTS `agent_property_access` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `agent_id` INT NOT NULL,
  `property_id` INT NOT NULL,
  `can_edit` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_agent_property` (`agent_id`, `property_id`),
  KEY `agent_idx` (`agent_id`),
  KEY `property_idx` (`property_id`),
  CONSTRAINT `fk_access_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_property` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed opcional: liberar todas as propriedades atuais para o admin (id=1) e primeiro agente (id=2) se existirem
INSERT INTO agent_property_access (agent_id, property_id, can_edit)
SELECT 2 AS agent_id, p.id, 0 FROM properties p
ON DUPLICATE KEY UPDATE can_edit = VALUES(can_edit);
