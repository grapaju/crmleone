<?php
// Endpoint para detalhes completos do Lead, incluindo dicas
require_once __DIR__ . '/../models/Lead.php';
require_once __DIR__ . '/TipController.php';

class LeadDetailsController
{
    private $db;
    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getDetails($leadId)
    {
        $leadModel = new Lead($this->db);
        $tipController = new TipController($this->db);
        $lead = $leadModel->read($leadId);
        if (!$lead) return null;
        $lead['activities'] = $leadModel->getActivities($leadId);
        $lead['scoreDetails'] = $leadModel->getScoreDetails($leadId);
        $lead['tips'] = $tipController->getTipsForLead($leadId);
        return $lead;
    }
}
