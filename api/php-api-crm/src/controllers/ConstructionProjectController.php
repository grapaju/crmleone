<?php

require_once '../models/ConstructionProject.php';

class ConstructionProjectController {
    private $constructionProject;

    public function __construct() {
        $this->constructionProject = new ConstructionProject();
    }

    public function create($data) {
        return $this->constructionProject->create($data);
    }

    public function read($id) {
        return $this->constructionProject->read($id);
    }

    public function update($id, $data) {
        return $this->constructionProject->update($id, $data);
    }

    public function delete($id) {
        return $this->constructionProject->delete($id);
    }

    public function readAll() {
        return $this->constructionProject->readAll();
    }
}