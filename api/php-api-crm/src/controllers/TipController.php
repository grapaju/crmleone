<?php
// Endpoint para retornar dicas (tips) do banco, alinhadas ao leadsTip.js
require_once __DIR__ . '/../config/database.php';

class TipController
{
    private $db;
    public function __construct($db)
    {
        $this->db = $db;
    }

    // Retorna todas as dicas padrão
    public function getAllTips()
    {
        $stmt = $this->db->prepare("SELECT id, type, category, priority, description, canal, ativa FROM tips WHERE ativa = 1 ORDER BY priority ASC, id ASC");
        $stmt->execute();
        $tips = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $tips;
    }

    // Retorna dicas ativas/desativadas para um lead específico
    public function getTipsForLead($leadId)
    {
        $sql = "SELECT t.id, t.type, t.category, t.priority, t.description, t.canal, 
                       COALESCE(lt.ativa, t.ativa) as ativa
                FROM tips t
                LEFT JOIN lead_tips lt ON lt.tip_id = t.id AND lt.lead_id = :leadId
                WHERE t.ativa = 1
                ORDER BY t.priority ASC, t.id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->bindParam(':leadId', $leadId);
        $stmt->execute();
        $tips = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $tips;
    }

    // Ativa/desativa dica para um lead
    public function setTipStatusForLead($leadId, $tipId, $ativa)
    {
        // Verifica se já existe
        $stmt = $this->db->prepare("SELECT id FROM lead_tips WHERE lead_id = :leadId AND tip_id = :tipId");
        $stmt->bindParam(':leadId', $leadId);
        $stmt->bindParam(':tipId', $tipId);
        $stmt->execute();
        $exists = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($exists) {
            $stmt = $this->db->prepare("UPDATE lead_tips SET ativa = :ativa WHERE lead_id = :leadId AND tip_id = :tipId");
        } else {
            $stmt = $this->db->prepare("INSERT INTO lead_tips (lead_id, tip_id, ativa) VALUES (:leadId, :tipId, :ativa)");
        }
        $stmt->bindParam(':leadId', $leadId);
        $stmt->bindParam(':tipId', $tipId);
        $stmt->bindParam(':ativa', $ativa, PDO::PARAM_BOOL);
        return $stmt->execute();
    }
}
