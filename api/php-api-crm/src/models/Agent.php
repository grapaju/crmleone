<?php

class Agent
{
    private $conn;
    private $table = 'agents';

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function create($data)
    {
        $query = "INSERT INTO {$this->table} 
            (name, email, phone, document, status, role, password) 
            VALUES 
            (:name, :email, :phone, :document, :status, :role, :password)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':phone', $data['phone']);
        $stmt->bindParam(':document', $data['document']);
        $stmt->bindParam(':status', $data['status']);
        $stmt->bindParam(':role', $data['role']);

        // Criptografa a senha antes de salvar
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt->bindParam(':password', $hashedPassword);

        return $stmt->execute();
    }

    public function getAll()
    {
        $stmt = $this->conn->prepare("SELECT id, name, email, phone, document, status, role FROM {$this->table}");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id)
    {
        $stmt = $this->conn->prepare("SELECT id, name, email, phone, document, status, role FROM {$this->table} WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function update($id, $data)
    {
        $fields = "name = :name, email = :email, phone = :phone, document = :document, status = :status, role = :role";

        // Se senha foi enviada, atualiza também
        if (!empty($data['password'])) {
            $fields .= ", password = :password";
        }

        $query = "UPDATE {$this->table} SET {$fields} WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':phone', $data['phone']);
        $stmt->bindParam(':document', $data['document']);
        $stmt->bindParam(':status', $data['status']);
        $stmt->bindParam(':role', $data['role']);

        if (!empty($data['password'])) {
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt->bindParam(':password', $hashedPassword);
        }

        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        return $stmt->execute();
    }

    public function delete($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM {$this->table} WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
