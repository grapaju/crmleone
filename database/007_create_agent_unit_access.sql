CREATE TABLE IF NOT EXISTS `agent_unit_access` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `agent_id` INT NOT NULL,
  `unit_id` INT NOT NULL,
  `can_edit` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_agent_unit` (`agent_id`, `unit_id`),
  KEY `agent_idx` (`agent_id`),
  KEY `unit_idx` (`unit_id`),
  CONSTRAINT `fk_access_unit_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_unit` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
