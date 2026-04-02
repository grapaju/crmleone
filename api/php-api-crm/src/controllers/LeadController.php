<?php

require_once __DIR__ . '/../models/Lead.php';

class LeadController
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function create($data)
    {
        $lead = new Lead($this->db);
        $id = $lead->create($data);
        if ($id) {
            $lead->calculateScore($id);
        }
        return $id;
    }

    public function read($id)
    {
        $lead = new Lead($this->db);
        $data = $lead->read($id);
        if (!$data) return null;
        // attach activities and score breakdown
        $activities = $lead->getActivities($id);
        $scoreDetails = $lead->getScoreDetails($id);
        $data['activities'] = $activities;
        $data['scoreDetails'] = $scoreDetails;
        return $data;
    }

    public function readAll()
    {
        $lead = new Lead($this->db);
        return $lead->readAll();
    }

    public function update($id, $data)
    {
        $lead = new Lead($this->db);
        $ok = $lead->update($id, $data);
        if ($ok) {
            $lead->calculateScore($id);
            // return the updated lead with activities and scoreDetails
            $updated = $lead->read($id);
            $updated['activities'] = $lead->getActivities($id);
            $updated['scoreDetails'] = $lead->getScoreDetails($id);
            return $updated;
        }
        return false;
    }

    public function delete($id)
    {
        $lead = new Lead($this->db);
        return $lead->delete($id);
    }

    public function top($minScore = 50)
    {
        $lead = new Lead($this->db);
        return $lead->getHotLeads($minScore);
    }
}
