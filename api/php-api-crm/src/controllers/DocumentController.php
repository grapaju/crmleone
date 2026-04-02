<?php
require_once __DIR__ . '/../models/Document.php';

class DocumentController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function create($data) {
        $document = new Document($this->db);
        return $document->create($data);
    }

    public function read($id) {
        $document = new Document($this->db);
        return $document->read($id);
    }

    public function update($id, $data) {
        $document = new Document($this->db);
        return $document->update($id, $data);
    }

    public function delete($id) {
        $document = new Document($this->db);
        return $document->delete($id);
    }

    public function readAll() {
        $document = new Document($this->db);
        return $document->readAll();
    }
}
?>