<?php
class Feature
{
    private $pdo;
    private $tableName;
    private $nameColumn;
    private $categoryColumn;

    public function __construct($db)
    {
        $this->pdo = $db;
        // Detect whether DB uses 'features' (english) or 'caracteristicas' (portuguese)
        try {
            $stmt = $this->pdo->prepare("SELECT table_name FROM information_schema.tables WHERE table_name IN ('features','caracteristicas')");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (in_array('features', $rows)) {
                $this->tableName = 'features';
                $this->nameColumn = 'name';
                $this->categoryColumn = 'category';
            } elseif (in_array('caracteristicas', $rows)) {
                $this->tableName = 'caracteristicas';
                // column in portuguese schema is 'nome'
                $this->nameColumn = 'nome';
                $this->categoryColumn = 'categoria';
            } else {
                // default to features
                $this->tableName = 'features';
                $this->nameColumn = 'name';
                $this->categoryColumn = 'category';
            }
        } catch (PDOException $e) {
            // fallback defaults
            $this->tableName = 'features';
            $this->nameColumn = 'name';
            $this->categoryColumn = 'category';
        }
    }

    public function getAll()
    {
    $sql = "SELECT id, " . $this->nameColumn . " AS name, " . $this->categoryColumn . " AS category FROM " . $this->tableName . " ORDER BY id";
    $stmt = $this->pdo->query($sql);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id)
    {
    $sql = "SELECT id, " . $this->nameColumn . " AS name, " . $this->categoryColumn . " AS category FROM " . $this->tableName . " WHERE id = ?";
    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($data)
    {
    $col = $this->nameColumn;
    $sql = "INSERT INTO " . $this->tableName . " ($col) VALUES (?)";
    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([$data['name']]);
        return $this->pdo->lastInsertId();
    }

    public function update($id, $data)
    {
    $col = $this->nameColumn;
    $sql = "UPDATE " . $this->tableName . " SET $col = ? WHERE id = ?";
    $stmt = $this->pdo->prepare($sql);
    return $stmt->execute([$data['name'], $id]);
    }

    public function delete($id)
    {
    $sql = "DELETE FROM " . $this->tableName . " WHERE id = ?";
    $stmt = $this->pdo->prepare($sql);
    return $stmt->execute([$id]);
    }
}
