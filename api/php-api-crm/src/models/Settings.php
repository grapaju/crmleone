<?php

class Settings {
    private $conn;
    private $table = 'settings';

    public $id;
    public $key;
    public $value;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table . " (key, value) VALUES (:key, :value)";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':key', $this->key);
        $stmt->bindParam(':value', $this->value);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    public function read() {
        $query = "SELECT * FROM " . $this->table;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    public function update() {
        $query = "UPDATE " . $this->table . " SET value = :value WHERE key = :key";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':key', $this->key);
        $stmt->bindParam(':value', $this->value);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    public function delete() {
        $query = "DELETE FROM " . $this->table . " WHERE key = :key";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':key', $this->key);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }
}