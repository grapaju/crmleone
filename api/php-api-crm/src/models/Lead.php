<?php

class Lead
{
    private $conn;
    private $table_name = "leads";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function create($data)
    {
        $query = "INSERT INTO {$this->table_name} 
            (name, email, phone, source, interest, budget, location, notes, status, agent_id, propertie_id)
            VALUES 
            (:name, :email, :phone, :source, :interest, :budget, :location, :notes, :status, :agent_id, :propertie_id)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":source", $data['source']);
        $stmt->bindParam(":interest", $data['interest']);
        $stmt->bindParam(":budget", $data['budget']);
        $stmt->bindParam(":location", $data['location']);
        $stmt->bindParam(":notes", $data['notes']);
        $stmt->bindParam(":status", $data['status']);
        $stmt->bindParam(":agent_id", $data['agent_id']);
        $stmt->bindParam(":propertie_id", $data['propertie_id']);

        $stmt->execute();
        return $this->conn->lastInsertId(); // retorna id do lead criado
    }

    public function read($id)
    {
        $query = "SELECT l.*, a.name AS agent_name FROM {$this->table_name} l LEFT JOIN agents a ON l.agent_id = a.id WHERE l.id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Fetch lead activities (from trigger-created table)
    public function getActivities($leadId)
    {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC");
            $stmt->execute([$leadId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $rows ?: [];
        } catch (Exception $e) {
            return [];
        }
    }

    // Provide a score breakdown for a lead (without updating DB)
    public function getScoreDetails($leadId)
    {
        $score = 0;
        $components = [];

        // Fetch lead
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table_name} WHERE id = ?");
        $stmt->execute([$leadId]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$lead) return ['score' => 0, 'components' => [], 'appointments' => [], 'history' => []];

        // basic fields
        if (!empty($lead['email'])) {
            $score += 5;
            $components[] = ['label' => 'Email informado', 'value' => 5];
        }
        if (!empty($lead['phone'])) {
            $score += 5;
            $components[] = ['label' => 'Telefone informado', 'value' => 5];
        }
        if ((int)$lead['budget'] >= 300000) {
            $score += 10;
            $components[] = ['label' => 'Orçamento >= 300k', 'value' => 10];
        }

        // appointments
        $stmt = $this->conn->prepare("SELECT * FROM appointments WHERE lead_id = ?");
        $stmt->execute([$leadId]);
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($appointments as $appt) {
            if ($appt['status'] === "Concluído") {
                $score += 20;
                $components[] = ['label' => "Ação concluída (#{$appt['id']})", 'value' => 20];
            }
            if ($appt['type'] === "Apresentação de imóvel") {
                $score += 30;
                $components[] = ['label' => "Apresentação de imóvel (#{$appt['id']})", 'value' => 30];
            }
        }

        // history
        $stmt = $this->conn->prepare("SELECT * FROM history WHERE table_id = ?");
        $stmt->execute([$leadId]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($history as $h) {
            if ($h['channel'] === "email" && $h['status'] === "Enviado") {
                $score += 5;
                $components[] = ['label' => "Email enviado (history #{$h['id']})", 'value' => 5];
            }
        }

        // clamp
        $score = max(0, min(100, $score));

        return [
            'score' => $score,
            'components' => $components,
            'appointments' => $appointments,
            'history' => $history
        ];
    }

    public function readAll()
    {
        // Retorna os leads com o nome do agente (agent_name)
        $query = "SELECT l.*, a.name AS agent_name FROM {$this->table_name} l LEFT JOIN agents a ON l.agent_id = a.id ORDER BY l.score DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function update($id, $data)
    {
        $query = "UPDATE {$this->table_name} SET 
            name = :name,
            email = :email,
            phone = :phone,
            source = :source,
            interest = :interest,
            budget = :budget,
            location = :location,
            notes = :notes,
            status = :status,
            agent_id = :agent_id,
            propertie_id = :propertie_id
            WHERE id = :id";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":source", $data['source']);
        $stmt->bindParam(":interest", $data['interest']);
        $stmt->bindParam(":budget", $data['budget']);
        $stmt->bindParam(":location", $data['location']);
        $stmt->bindParam(":notes", $data['notes']);
        $stmt->bindParam(":status", $data['status']);
        $stmt->bindParam(":agent_id", $data['agent_id']);
        $stmt->bindParam(":propertie_id", $data['propertie_id']);

        return $stmt->execute();
    }

    public function delete($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM {$this->table_name} WHERE id = :id");
        $stmt->bindParam(":id", $id);
        return $stmt->execute();
    }

    public function calculateScore($leadId)
    {
        $score = 0;

        // Buscar lead
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table_name} WHERE id = ?");
        $stmt->execute([$leadId]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lead) return 0;

        // ---- Regras simples ----
        if (!empty($lead['email'])) $score += 5;
        if (!empty($lead['phone'])) $score += 5;
        if ((int)$lead['budget'] >= 300000) $score += 10;

        // Buscar agendamentos
        $stmt = $this->conn->prepare("SELECT * FROM appointments WHERE lead_id = ?");
        $stmt->execute([$leadId]);
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($appointments as $appt) {
            if ($appt['status'] === "Confirmado" || $appt['status'] === "Concluído") $score += 20;
            if ($appt['type'] === "Apresentação de imóvel") $score += 30;
        }

        // Buscar histórico de comunicações
        $stmt = $this->conn->prepare("SELECT * FROM history WHERE table_id = ?");
        $stmt->execute([$leadId]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($history as $h) {
            if ($h['channel'] === "email" && $h['status'] === "Enviado") {
                $score += 5;
            }
        }

        // Atualizar score no banco
        $stmt = $this->conn->prepare("UPDATE {$this->table_name} SET score = :score WHERE id = :id");
        $stmt->bindParam(":score", $score);
        $stmt->bindParam(":id", $leadId);
        $stmt->execute();

        return $score;
    }

    public function getHotLeads($minScore = 50)
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table_name} WHERE score >= :score ORDER BY score DESC");
        $stmt->bindParam(":score", $minScore, PDO::PARAM_INT);
        $stmt->execute();
        $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // adicionar dicas
        foreach ($leads as &$lead) {
            $lead['tip'] = $this->gerarDica($lead);
        }

        return $leads;
    }

    private function gerarDica($lead)
    {
        if ($lead['score'] >= 80 && $lead['status'] !== "Proposta enviada") {
            return "💡 Enviar proposta para este lead!";
        }
        if ($lead['score'] >= 60 && $lead['status'] !== "Visita agendada") {
            return "📅 Agendar uma visita.";
        }
        if ($lead['score'] >= 50) {
            return "📢 Reforçar contato com o lead.";
        }
        return "✅ Lead em acompanhamento.";
    }
}
