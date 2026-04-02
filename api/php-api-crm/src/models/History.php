<?php
class History
{
    private $conn;
    private $table = "history";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function getAll()
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} ORDER BY date DESC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create($data)
    {
        $stmt = $this->conn->prepare(
            "INSERT INTO {$this->table} (table_id, channel, recipients, status) 
             VALUES (:table_id, :channel, :recipients, :status)"
        );
        $stmt->execute($data);
        return $this->conn->lastInsertId();
    }
}
