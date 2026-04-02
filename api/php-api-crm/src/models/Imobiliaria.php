<?php
class Imobiliaria
{
    private $conn;
    private $table = "imobiliarias";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function getAll()
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} ORDER BY name");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($name)
    {
        $stmt = $this->conn->prepare("INSERT INTO {$this->table} (name) VALUES (?)");
        if ($stmt->execute([$name])) {
            return $this->getById($this->conn->lastInsertId());
        }
        return false;
    }

    public function update($id, $name)
    {
        $stmt = $this->conn->prepare("UPDATE {$this->table} SET name = ? WHERE id = ?");
        return $stmt->execute([$name, $id]);
    }

    public function delete($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM {$this->table} WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
