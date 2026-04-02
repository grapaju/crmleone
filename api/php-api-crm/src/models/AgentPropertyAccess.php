<?php

class AgentPropertyAccess
{
    private $db;
    private $table = 'agent_property_access';

    public function __construct($db)
    {
        $this->db = $db;
        $this->ensureTable();
    }

    private function ensureTable()
    {
        try {
            $check = $this->db->query("SHOW TABLES LIKE 'agent_property_access'");
            if ($check->rowCount() === 0) {
                $sql = "CREATE TABLE IF NOT EXISTS `agent_property_access` (
                    `id` INT NOT NULL AUTO_INCREMENT,
                    `agent_id` INT NOT NULL,
                    `property_id` INT NOT NULL,
                    `can_edit` TINYINT(1) DEFAULT 0,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    UNIQUE KEY `uniq_agent_property` (`agent_id`, `property_id`),
                    KEY `agent_idx` (`agent_id`),
                    KEY `property_idx` (`property_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
                $this->db->exec($sql);
                // tentar adicionar FKs (ignorando erro se não existir)
                try { $this->db->exec("ALTER TABLE `agent_property_access` ADD CONSTRAINT `fk_access_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE"); } catch(Exception $e) {}
                try { $this->db->exec("ALTER TABLE `agent_property_access` ADD CONSTRAINT `fk_access_property` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE"); } catch(Exception $e) {}
            }
        } catch (Exception $e) {
            // silencioso: se não conseguir checar/criar, as consultas subsequentes podem falhar e serão tratadas
        }
    }

    public function getPropertyIdsByAgent($agentId)
    {
        try {
            $sql = "SELECT property_id FROM {$this->table} WHERE agent_id = :agent_id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':agent_id', $agentId, PDO::PARAM_INT);
            $stmt->execute();
            return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        } catch (Exception $e) {
            // Falha (ex: tabela não existe e não conseguiu criar) => retornar lista vazia para não quebrar frontend
            return [];
        }
    }

    public function replaceAgentAccess($agentId, $propertyIds, $canEditDefault = 0)
    {
        $this->db->beginTransaction();
        try {
            $del = $this->db->prepare("DELETE FROM {$this->table} WHERE agent_id = :agent_id");
            $del->execute([':agent_id' => $agentId]);

            if (!empty($propertyIds)) {
                $ins = $this->db->prepare("INSERT INTO {$this->table} (agent_id, property_id, can_edit) VALUES (:agent_id, :property_id, :can_edit)");
                foreach ($propertyIds as $pid) {
                    $ins->execute([
                        ':agent_id' => $agentId,
                        ':property_id' => $pid,
                        ':can_edit' => $canEditDefault ? 1 : 0,
                    ]);
                }
            }
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }
}
