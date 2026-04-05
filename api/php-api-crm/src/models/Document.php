<?php

class Document {
    private $conn;
    private $table = 'documents';

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create a new document. $data is an associative array with keys matching columns.
    public function create($data) {
        $query = "INSERT INTO {$this->table} (title, description, category, type, file_path, property_id, expiryDate, uploaded_by, created_at) VALUES (:title, :description, :category, :type, :file_path, :property_id, :expiryDate, :uploaded_by, :created_at)";
        $stmt = $this->conn->prepare($query);

        $now = date('Y-m-d H:i:s');

        $title = isset($data['title']) ? htmlspecialchars(strip_tags($data['title'])) : '';
        $description = isset($data['description']) ? htmlspecialchars(strip_tags($data['description'])) : null;
        $category = isset($data['category']) ? htmlspecialchars(strip_tags($data['category'])) : '';
        $type = isset($data['type']) ? htmlspecialchars(strip_tags($data['type'])) : '';
        $file_path = isset($data['file_path']) ? $data['file_path'] : '';
        $property_id = isset($data['property_id']) ? $data['property_id'] : null;
        $expiryDate = isset($data['expiryDate']) ? $data['expiryDate'] : null;
        $uploaded_by = isset($data['uploaded_by']) ? $data['uploaded_by'] : null;

        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':category', $category);
        $stmt->bindParam(':type', $type);
        $stmt->bindParam(':file_path', $file_path);
        $stmt->bindParam(':property_id', $property_id);
        $stmt->bindParam(':expiryDate', $expiryDate);
        $stmt->bindParam(':uploaded_by', $uploaded_by);
        $stmt->bindParam(':created_at', $now);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    // Read all documents as array
    public function readAll() {
        $query = "SELECT * FROM {$this->table} ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            if (!array_key_exists('expiryDate', $row) && array_key_exists('expirydate', $row)) {
                $row['expiryDate'] = $row['expirydate'];
            }
        }
        return $rows;
    }

    // Read one document by id
    public function read($id) {
        $query = "SELECT * FROM {$this->table} WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !array_key_exists('expiryDate', $row) && array_key_exists('expirydate', $row)) {
            $row['expiryDate'] = $row['expirydate'];
        }
        return $row ? $row : null;
    }

    // Update document by id with provided data
    public function update($id, $data) {
        $fields = [];
        $params = [];

        $allowed = ['title','description','category','type','file_path','property_id','expiryDate','uploaded_by'];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "{$f} = :{$f}";
                $params[":{$f}"] = $data[$f];
            }
        }

        if (empty($fields)) return false;

        $params[':id'] = $id;
        $params[':updated_at'] = date('Y-m-d H:i:s');

        $sql = "UPDATE {$this->table} SET " . implode(', ', $fields) . ", updated_at = :updated_at WHERE id = :id";
        $stmt = $this->conn->prepare($sql);

        foreach ($params as $k => $v) {
            // bind nulls properly
            if ($v === null) {
                $stmt->bindValue($k, null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue($k, $v);
            }
        }

        return $stmt->execute();
    }

    public function delete($id) {
        $query = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}