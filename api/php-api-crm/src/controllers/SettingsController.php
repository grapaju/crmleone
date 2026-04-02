<?php

require_once '../models/Settings.php';

class SettingsController {
    private $settingsModel;

    public function __construct() {
        $this->settingsModel = new Settings();
    }

    public function create($data) {
        return $this->settingsModel->create($data);
    }

    public function read($id) {
        return $this->settingsModel->read($id);
    }

    public function update($id, $data) {
        return $this->settingsModel->update($id, $data);
    }

    public function delete($id) {
        return $this->settingsModel->delete($id);
    }

    public function readAll() {
        return $this->settingsModel->readAll();
    }
}