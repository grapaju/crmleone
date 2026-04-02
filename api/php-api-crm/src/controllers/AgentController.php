<?php

require_once __DIR__ . '/../models/Agent.php';

class AgentController
{
    private $agentModel;

    public function __construct($db)
    {
        $this->agentModel = new Agent($db);
    }

    /* --------------------
       Funções de tratamento
       -------------------- */

    // Remove máscara de telefone
    private function unmaskPhone($phone)
    {
        return preg_replace('/\D/', '', $phone);
    }

    // Formata telefone para exibição
    private function formatPhone($phone)
    {
        $phone = preg_replace('/\D/', '', $phone);
        if (strlen($phone) === 11) {
            return preg_replace('/(\d{2})(\d{5})(\d{4})/', '($1) $2-$3', $phone);
        } elseif (strlen($phone) === 10) {
            return preg_replace('/(\d{2})(\d{4})(\d{4})/', '($1) $2-$3', $phone);
        }
        return $phone;
    }

    // Sanitiza e normaliza os dados antes de salvar
    private function sanitizeData($data)
    {
        if (isset($data['phone'])) {
            $data['phone'] = $this->unmaskPhone($data['phone']);
        }

        if (isset($data['email'])) {
            $data['email'] = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
        }

        if (isset($data['name'])) {
            $data['name'] = trim($data['name']);
        }

        return $data;
    }

    // Formata dados antes de enviar ao front
    private function formatAgent($agent)
    {
        if (!$agent) return null;
        if (isset($agent['phone'])) {
            $agent['phone'] = $this->formatPhone($agent['phone']);
        }
        return $agent;
    }

    /* --------------------
       Métodos públicos
       -------------------- */

    public function createAgent($data)
    {
        $data = $this->sanitizeData($data);
        return $this->agentModel->create($data);
    }

    public function updateAgent($id, $data)
    {
        $data = $this->sanitizeData($data);
        return $this->agentModel->update($id, $data);
    }

    public function getAllAgents()
    {
        $agents = $this->agentModel->getAll();
        return array_map([$this, 'formatAgent'], $agents);
    }

    public function getAgentById($id)
    {
        $agent = $this->agentModel->getById($id);
        return $this->formatAgent($agent);
    }

    public function deleteAgent($id)
    {
        return $this->agentModel->delete($id);
    }
}
