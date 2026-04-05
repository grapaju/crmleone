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
            $check = $this->db->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'agent_property_access'");
            $check->execute();
            if ((int)$check->fetchColumn() === 0) {
                $sql = "CREATE TABLE IF NOT EXISTS agent_property_access (
                    id BIGSERIAL PRIMARY KEY,
                    agent_id BIGINT NOT NULL,
                    property_id BIGINT NOT NULL,
                    can_edit BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uniq_agent_property UNIQUE (agent_id, property_id)
                );";
                $this->db->exec($sql);
                $this->db->exec("CREATE INDEX IF NOT EXISTS agent_property_access_agent_idx ON agent_property_access (agent_id)");
                $this->db->exec("CREATE INDEX IF NOT EXISTS agent_property_access_property_idx ON agent_property_access (property_id)");
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
