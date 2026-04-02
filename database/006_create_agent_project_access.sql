CREATE TABLE IF NOT EXISTS `agent_project_access` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `agent_id` INT NOT NULL,
  `project_id` INT NOT NULL,
  `can_edit` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_agent_project` (`agent_id`, `project_id`),
  KEY `agent_idx` (`agent_id`),
  KEY `project_idx` (`project_id`),
  CONSTRAINT `fk_access_project_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
