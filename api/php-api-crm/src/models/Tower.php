<?php
class Tower
{
    private $pdo;
    private $table;
    private $cols;

    public function __construct($db)
    {
        $this->pdo = $db;
        // detect available table and set column mapping
        $this->table = null;
        $this->cols = [
            'id' => 'id',
            'project' => 'obra_id',
            'name' => 'nome',
            'floors' => 'numero_andares',
            'units_per_floor' => 'unidades_por_andar',
            'initial_floor' => 'initial_floor',
            'initial_unit_start' => 'initial_unit_start',
        ];

        try {
            $stmt = $this->pdo->prepare("SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_NAME IN ('torres','towers')");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (in_array('torres', $rows)) {
                $this->table = 'torres';
                // default mapping already set to Portuguese
            } elseif (in_array('towers', $rows)) {
                $this->table = 'towers';
                // adjust mapping to English schema
                $this->cols['project'] = 'project_id';
                $this->cols['name'] = 'name';
                $this->cols['floors'] = 'floors';
                $this->cols['units_per_floor'] = 'units_per_floor';
            } else {
                // fallback: prefer 'torres'
                $this->table = 'torres';
            }
        } catch (PDOException $e) {
            // on error, default to Portuguese names
            $this->table = 'torres';
        }
    }

    private function col($logical)
    {
        return $this->cols[$logical] ?? $logical;
    }

    public function create($data)
    {
        // map incoming fields: accept both portuguese and english keys
        $projectCol = $this->col('project');
        $nameCol = $this->col('name');
        $floorsCol = $this->col('floors');
        $unitsCol = $this->col('units_per_floor');

        $initialFloorCol = $this->col('initial_floor');
        $initialUnitStartCol = $this->col('initial_unit_start');

        // detect if columns exist physically
        $columns = [];
        try {
            $desc = $this->pdo->query("DESCRIBE `{$this->table}`")->fetchAll(PDO::FETCH_COLUMN);
            $columns = is_array($desc) ? array_flip($desc) : [];
        } catch (Throwable $e) {
            $columns = [];
        }
        $hasInitialFloor = isset($columns[$initialFloorCol]);
        $hasInitialUnitStart = isset($columns[$initialUnitStartCol]);
        // new optional columns for typical/special floors
        $typStartCol = 'typical_floors_start';
        $typEndCol = 'typical_floors_end';
        $hasGroundCol = 'has_ground';
        $hasPentCol = 'has_penthouse';
        $hasMezzCol = 'has_mezzanine';
        $hasTypStart = isset($columns[$typStartCol]);
        $hasTypEnd = isset($columns[$typEndCol]);
        $hasGround = isset($columns[$hasGroundCol]);
        $hasPent = isset($columns[$hasPentCol]);
        $hasMezz = isset($columns[$hasMezzCol]);

        $insertCols = [$projectCol, $nameCol, $floorsCol, $unitsCol];
        $values = [
            $data['obra_id'] ?? $data['project_id'] ?? $data['projectId'] ?? null,
            $data['nome'] ?? $data['name'] ?? null,
            $data['numero_andares'] ?? $data['floors'] ?? null,
            $data['unidades_por_andar'] ?? $data['units_per_floor'] ?? $data['unitsPerFloor'] ?? null,
        ];
        if ($hasInitialFloor) {
            $insertCols[] = $initialFloorCol;
            $values[] = $data['initial_floor'] ?? $data['initialFloor'] ?? null;
        }
        if ($hasInitialUnitStart) {
            $insertCols[] = $initialUnitStartCol;
            $values[] = $data['initial_unit_start'] ?? $data['initialUnitStart'] ?? null;
        }
        if ($hasTypStart) { $insertCols[] = $typStartCol; $values[] = $data['typical_floors_start'] ?? $data['typicalFloorsStart'] ?? null; }
        if ($hasTypEnd) { $insertCols[] = $typEndCol; $values[] = $data['typical_floors_end'] ?? $data['typicalFloorsEnd'] ?? null; }
        if ($hasGround) { $insertCols[] = $hasGroundCol; $values[] = isset($data['has_ground']) ? (int)!!$data['has_ground'] : (isset($data['hasGround']) ? (int)!!$data['hasGround'] : 0); }
        if ($hasPent) { $insertCols[] = $hasPentCol; $values[] = isset($data['has_penthouse']) ? (int)!!$data['has_penthouse'] : (isset($data['hasPenthouse']) ? (int)!!$data['hasPenthouse'] : 0); }
        if ($hasMezz) { $insertCols[] = $hasMezzCol; $values[] = isset($data['has_mezzanine']) ? (int)!!$data['has_mezzanine'] : (isset($data['hasMezzanine']) ? (int)!!$data['hasMezzanine'] : 0); }

        $placeholders = implode(', ', array_fill(0, count($insertCols), '?'));
        $colList = implode(', ', $insertCols);
        $stmt = $this->pdo->prepare("INSERT INTO `{$this->table}` ($colList) VALUES ($placeholders)");
        $stmt->execute($values);
        return $this->pdo->lastInsertId();
    }

    public function getByProject($projectId)
    {
        $projectCol = $this->col('project');
        $stmt = $this->pdo->prepare("SELECT * FROM `{$this->table}` WHERE {$projectCol} = ?");
        $stmt->execute([$projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAll()
    {
        $stmt = $this->pdo->query("SELECT * FROM `{$this->table}`");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `{$this->table}` WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function update($id, $data)
    {
        $nameCol = $this->col('name');
        $floorsCol = $this->col('floors');
        $unitsCol = $this->col('units_per_floor');
        $initialFloorCol = $this->col('initial_floor');
        $initialUnitStartCol = $this->col('initial_unit_start');

        $columns = [];
        try {
            $desc = $this->pdo->query("DESCRIBE `{$this->table}`")->fetchAll(PDO::FETCH_COLUMN);
            $columns = is_array($desc) ? array_flip($desc) : [];
        } catch (Throwable $e) {
            $columns = [];
        }

        $sets = ["{$nameCol} = ?", "{$floorsCol} = ?", "{$unitsCol} = ?"];
        $values = [
            $data['nome'] ?? $data['name'] ?? null,
            $data['numero_andares'] ?? $data['floors'] ?? null,
            $data['unidades_por_andar'] ?? $data['units_per_floor'] ?? $data['unitsPerFloor'] ?? null,
        ];
        if (isset($columns[$initialFloorCol])) {
            $sets[] = "{$initialFloorCol} = ?";
            $values[] = $data['initial_floor'] ?? $data['initialFloor'] ?? null;
        }
        if (isset($columns[$initialUnitStartCol])) {
            $sets[] = "{$initialUnitStartCol} = ?";
            $values[] = $data['initial_unit_start'] ?? $data['initialUnitStart'] ?? null;
        }
        // new optionals
        if (isset($columns['typical_floors_start'])) { $sets[] = "typical_floors_start = ?"; $values[] = $data['typical_floors_start'] ?? $data['typicalFloorsStart'] ?? null; }
        if (isset($columns['typical_floors_end'])) { $sets[] = "typical_floors_end = ?"; $values[] = $data['typical_floors_end'] ?? $data['typicalFloorsEnd'] ?? null; }
        if (isset($columns['has_ground'])) { $sets[] = "has_ground = ?"; $values[] = isset($data['has_ground']) ? (int)!!$data['has_ground'] : (isset($data['hasGround']) ? (int)!!$data['hasGround'] : 0); }
        if (isset($columns['has_penthouse'])) { $sets[] = "has_penthouse = ?"; $values[] = isset($data['has_penthouse']) ? (int)!!$data['has_penthouse'] : (isset($data['hasPenthouse']) ? (int)!!$data['hasPenthouse'] : 0); }
        if (isset($columns['has_mezzanine'])) { $sets[] = "has_mezzanine = ?"; $values[] = isset($data['has_mezzanine']) ? (int)!!$data['has_mezzanine'] : (isset($data['hasMezzanine']) ? (int)!!$data['hasMezzanine'] : 0); }
        $values[] = $id;
        $sql = "UPDATE `{$this->table}` SET " . implode(', ', $sets) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($values);
    }

    public function delete($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `{$this->table}` WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
