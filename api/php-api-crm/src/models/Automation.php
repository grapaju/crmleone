<?php
class Automation
{
    private $conn;
    private $table = "automations";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function getAll()
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table}");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function delete($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM {$this->table} WHERE id=?");
        return $stmt->execute([$id]);
    }

    public function toggle($id)
    {
        $stmt = $this->conn->prepare("UPDATE {$this->table} 
            SET status = CASE WHEN status='Ativa' THEN 'Inativa' ELSE 'Ativa' END 
            WHERE id=?");
        return $stmt->execute([$id]);
    }
}
