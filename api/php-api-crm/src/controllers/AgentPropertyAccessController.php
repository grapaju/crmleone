<?php
require_once __DIR__ . '/../models/AgentPropertyAccess.php';

class AgentPropertyAccessController
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function list($agentId)
    {
        $model = new AgentPropertyAccess($this->db);
        return $model->getPropertyIdsByAgent($agentId);
    }

    public function replace($agentId, $data)
    {
        $propertyIds = $data['property_ids'] ?? [];
        if (!is_array($propertyIds)) $propertyIds = [];
        $canEditDefault = $data['can_edit_default'] ?? 0;
        $model = new AgentPropertyAccess($this->db);
        $ok = $model->replaceAgentAccess($agentId, $propertyIds, $canEditDefault);
        if ($ok) {
            return [ 'agent_id' => (int)$agentId, 'property_ids' => $model->getPropertyIdsByAgent($agentId) ];
        }
        return false;
    }
}
