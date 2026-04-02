<?php

class Property
{
    private $conn;
    private $table_name = "properties";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function create($data)
    {
        $query = "INSERT INTO {$this->table_name}
            (title, price, address, city, state, zip_code, bedrooms, bathrooms, parking, area, type, status, property_type, agent_id, description, tags)
            VALUES
            (:title, :price, :address, :city, :state, :zip_code, :bedrooms, :bathrooms, :parking, :area, :type, :status, :property_type, :agent_id, :description, :tags)";
        $stmt = $this->conn->prepare($query);

        $stmt->bindValue(':title', $data['title']);
        $stmt->bindValue(':price', $data['price']);
        $stmt->bindValue(':address', $data['address']);
        $stmt->bindValue(':city', $data['city']);
        $stmt->bindValue(':state', $data['state']);
        $stmt->bindValue(':zip_code', $data['zip_code']);
        $stmt->bindValue(':bedrooms', $data['bedrooms']);
        $stmt->bindValue(':bathrooms', $data['bathrooms']);
        $stmt->bindValue(':parking', $data['parking']);
        $stmt->bindValue(':area', $data['area']);
        $stmt->bindValue(':type', $data['type']);
        $stmt->bindValue(':status', $data['status']);
        $stmt->bindValue(':property_type', $data['property_type']);
        $stmt->bindValue(':agent_id', $data['agent_id'] ?? null);
        // novos campos
        $stmt->bindValue(':description', $data['description']);
        // tags podem ser array/json; garantimos que seja string (JSON) antes de salvar
        $tagsVal = isset($data['tags']) && !is_string($data['tags']) ? json_encode($data['tags']) : ($data['tags'] ?? null);
        $stmt->bindValue(':tags', $tagsVal);

        if ($stmt->execute()) {
            return $this->read($this->conn->lastInsertId());
        }
        return false;
    }

    public function read($id)
    {
        $query = "SELECT * FROM {$this->table_name} WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            if (isset($row['tags']) && $row['tags'] !== null) {
                $decoded = json_decode($row['tags'], true);
                if (json_last_error() === JSON_ERROR_NONE) $row['tags'] = $decoded;
            }
        }
        return $row;
    }

    public function readAll()
    {
        $query = "SELECT * FROM {$this->table_name} ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            if (isset($row['tags']) && $row['tags'] !== null) {
                $decoded = json_decode($row['tags'], true);
                if (json_last_error() === JSON_ERROR_NONE) $row['tags'] = $decoded;
            }
        }
        return $rows;
    }

    public function update($id, $data)
    {
        $query = "UPDATE {$this->table_name} SET
            title = :title,
            price = :price,
            address = :address,
            city = :city,
            state = :state,
            zip_code = :zip_code,
            bedrooms = :bedrooms,
            bathrooms = :bathrooms,
            parking = :parking,
            area = :area,
            type = :type,
            status = :status,
            property_type = :property_type,
            agent_id = :agent_id,
            description = :description,
            tags = :tags,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        $stmt->bindValue(':title', $data['title']);
        $stmt->bindValue(':price', $data['price']);
        $stmt->bindValue(':address', $data['address']);
        $stmt->bindValue(':city', $data['city']);
        $stmt->bindValue(':state', $data['state']);
        $stmt->bindValue(':zip_code', $data['zip_code']);
        $stmt->bindValue(':bedrooms', $data['bedrooms']);
        $stmt->bindValue(':bathrooms', $data['bathrooms']);
        $stmt->bindValue(':parking', $data['parking']);
        $stmt->bindValue(':area', $data['area']);
        $stmt->bindValue(':type', $data['type']);
        $stmt->bindValue(':status', $data['status']);
        $stmt->bindValue(':property_type', $data['property_type']);
        $stmt->bindValue(':agent_id', $data['agent_id'] ?? null);
        // novos campos
        $stmt->bindValue(':description', $data['description']);
        $tagsVal = isset($data['tags']) && !is_string($data['tags']) ? json_encode($data['tags']) : ($data['tags'] ?? null);
        $stmt->bindValue(':tags', $tagsVal);
        $stmt->bindValue(':id', $id);

        if ($stmt->execute()) {
            return $this->read($id);
        }
        return false;
    }

    public function delete($id)
    {
        $query = "DELETE FROM {$this->table_name} WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }
}
