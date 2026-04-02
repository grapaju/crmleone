<?php

require_once '../models/Report.php';

class ReportController {
    private $reportModel;

    public function __construct() {
        $this->reportModel = new Report();
    }

    public function createReport($data) {
        return $this->reportModel->create($data);
    }

    public function getReports() {
        return $this->reportModel->getAll();
    }

    public function getReport($id) {
        return $this->reportModel->getById($id);
    }

    public function updateReport($id, $data) {
        return $this->reportModel->update($id, $data);
    }

    public function deleteReport($id) {
        return $this->reportModel->delete($id);
    }
}