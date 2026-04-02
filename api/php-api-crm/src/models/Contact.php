<?php

class Contact
{
    private $conn;
    private $table_name = "contacts";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function create($data)
    {
        $query = "INSERT INTO {$this->table_name} 
                  (name, email, phone, type, imobiliaria_id, notes) 
                  VALUES (:name, :email, :phone, :type, :imobiliaria_id, :notes)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":type", $data['type']);
        $stmt->bindParam(":imobiliaria_id", $data['imobiliaria_id']);
        $stmt->bindParam(":notes", $data['notes']);

        return $stmt->execute();
    }

    public function readAll()
    {
        $query = "SELECT c.*, i.name AS imobiliaria_nome
              FROM {$this->table_name} c
              LEFT JOIN imobiliarias i ON c.imobiliaria_id = i.id
              ORDER BY c.id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $result ?: [];
    }

    public function read($id)
    {
        $query = "SELECT c.*, i.name AS imobiliaria_nome
              FROM {$this->table_name} c
              LEFT JOIN imobiliarias i ON c.imobiliaria_id = i.id
              WHERE c.id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function update($id, $data)
    {
        $query = "UPDATE {$this->table_name} 
                  SET name=:name, email=:email, phone=:phone, type=:type, 
                      imobiliaria_id=:imobiliaria_id, notes=:notes 
                  WHERE id=:id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":type", $data['type']);
        $stmt->bindParam(":imobiliaria_id", $data['imobiliaria_id']);
        $stmt->bindParam(":notes", $data['notes']);
        $stmt->bindParam(":id", $id);

        return $stmt->execute();
    }

    public function delete($id)
    {
        $query = "DELETE FROM {$this->table_name} WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        return $stmt->execute();
    }
}
