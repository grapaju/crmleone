<?php
class Project
{
    private $pdo;
    private $columnCache;
    private $featuresTable;
    private $featuresNameCol;

    public function __construct($db)
    {
        $this->pdo = $db;
        $this->columnCache = null;
        // detect features/caracteristicas table naming
        try {
            $stmt = $this->pdo->prepare("SELECT table_name FROM information_schema.tables WHERE table_name IN ('features','caracteristicas')");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (in_array('features', $rows)) {
                $this->featuresTable = 'features';
                $this->featuresNameCol = 'name';
            } elseif (in_array('caracteristicas', $rows)) {
                $this->featuresTable = 'caracteristicas';
                $this->featuresNameCol = 'nome';
            } else {
                $this->featuresTable = 'features';
                $this->featuresNameCol = 'name';
            }
        } catch (PDOException $e) {
            $this->featuresTable = 'features';
            $this->featuresNameCol = 'name';
        }
    }

    private function columnExists($column)
    {
        if ($this->columnCache === null) {
            $stmt = $this->pdo->prepare("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'");
            $stmt->execute();
            $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $this->columnCache = array_flip($cols);
        }
        return isset($this->columnCache[$column]);
    }

    private function tableExists($table)
    {
        // Use information_schema to reliably check table existence with prepared statements
        try {
            $sql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$table]);
            return (bool) $stmt->fetchColumn();
        } catch (PDOException $e) {
            // If we cannot query information_schema (permissions, syntax), treat as table not existing
            return false;
        }
    }

    private function resolveFeatureNameColumn($table)
    {
        // Try preferred columns in order and return the first existing one.
        if ($this->tableHasColumn($table, 'name')) return 'name';
        if ($this->tableHasColumn($table, 'nome')) return 'nome';
        return null;
    }

    private function fetchProjectFeaturesSafe($projectId)
    {
        if (!$this->tableExists('project_features')) {
            return [];
        }

        // If detected table/column is inconsistent with runtime DB, fallback dynamically.
        $table = $this->featuresTable;
        $col = $this->featuresNameCol;
        if (!$this->tableExists($table) || !$this->tableHasColumn($table, $col)) {
            if ($this->tableExists('features')) {
                $table = 'features';
                $col = $this->resolveFeatureNameColumn('features') ?: 'name';
            } elseif ($this->tableExists('caracteristicas')) {
                $table = 'caracteristicas';
                $col = $this->resolveFeatureNameColumn('caracteristicas') ?: 'nome';
            }
        }

        try {
            $pf = $this->pdo->prepare("SELECT pf.feature_id, f." . $col . " AS name FROM project_features pf LEFT JOIN " . $table . " f ON f.id = pf.feature_id WHERE pf.project_id = ?");
            $pf->execute([$projectId]);
            $featRows = $pf->fetchAll(PDO::FETCH_ASSOC);
            return array_map(function ($r) {
                return ['id' => (int)$r['feature_id'], 'name' => $r['name'] ?? null];
            }, $featRows ?: []);
        } catch (PDOException $e) {
            // Never break project listing/details due to optional feature join.
            return [];
        }
    }

    private function tableHasColumn($table, $column)
    {
        try {
            $sql = "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ? AND column_name = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$table, $column]);
            return ((int)$stmt->fetchColumn()) > 0;
        } catch (PDOException $e) {
            return false;
        }
    }

    private function syncProjectFeatures($projectId, $features)
    {
        // Accept array of ids or array of objects with id
        $logFile = __DIR__ . '/../../api/logs/projects.log';
        $timestamp = date('Y-m-d H:i:s');
        @file_put_contents($logFile, "$timestamp | syncProjectFeatures called for project $projectId with payload: " . var_export($features, true) . "\n", FILE_APPEND | LOCK_EX);
        if (!is_array($features)) {
            @file_put_contents($logFile, "$timestamp | features payload is not array, aborting\n", FILE_APPEND | LOCK_EX);
            return;
        }

        // If relational table exists, sync there
        if ($this->tableExists('project_features')) {
            @file_put_contents($logFile, "$timestamp | table project_features exists = true\n", FILE_APPEND | LOCK_EX);
            // Normalize features: collect numeric ids and string names separately
            $ids = [];
            $names = [];
            foreach ($features as $f) {
                if (is_array($f)) {
                    if (isset($f['id']) && is_numeric($f['id'])) {
                        $ids[] = (int)$f['id'];
                        continue;
                    }
                    if (isset($f['id']) && is_string($f['id']) && is_numeric($f['id'])) {
                        $ids[] = (int)$f['id'];
                        continue;
                    }
                    if (isset($f['name'])) {
                        $n = trim((string)$f['name']);
                        if ($n !== '') $names[] = $n;
                        continue;
                    }
                }
                if (is_object($f)) {
                    if (isset($f->id) && is_numeric($f->id)) {
                        $ids[] = (int)$f->id;
                        continue;
                    }
                    if (isset($f->name)) {
                        $n = trim((string)$f->name);
                        if ($n !== '') $names[] = $n;
                        continue;
                    }
                }
                if (is_numeric($f)) {
                    $ids[] = (int)$f;
                    continue;
                }
                if (is_string($f) && trim($f) !== '') {
                    $names[] = trim($f);
                    continue;
                }
            }
            // make unique
            $ids = array_values(array_unique($ids));
            $names = array_values(array_unique($names));
            @file_put_contents($logFile, "$timestamp | normalized ids: " . var_export($ids, true) . " names: " . var_export($names, true) . "\n", FILE_APPEND | LOCK_EX);

            try {
                $this->pdo->beginTransaction();
                // Remove existing
                $del = $this->pdo->prepare("DELETE FROM project_features WHERE project_id = ?");
                @file_put_contents($logFile, "$timestamp | about to delete existing project_features for project $projectId\n", FILE_APPEND | LOCK_EX);
                $del->execute([$projectId]);
                @file_put_contents($logFile, "$timestamp | delete executed\n", FILE_APPEND | LOCK_EX);

                $inserted = 0;
                $existing = [];
                $missing = [];

                // Validate numeric ids first
                $candidateIds = array_values(array_filter($ids, 'is_numeric'));
                if (count($candidateIds) > 0) {
                    $placeholders = implode(', ', array_fill(0, count($candidateIds), '?'));
                    $sql = "SELECT id FROM " . $this->featuresTable . " WHERE id IN ($placeholders)";
                    $checkStmt = $this->pdo->prepare($sql);
                    $checkStmt->execute($candidateIds);
                    $foundRows = $checkStmt->fetchAll(PDO::FETCH_COLUMN);
                    $foundIds = array_map('intval', $foundRows ?: []);
                    $existing = array_merge($existing, $foundIds);
                    $missingIds = array_values(array_diff($candidateIds, $foundIds));
                    if (count($missingIds) > 0) {
                        @file_put_contents($logFile, "$timestamp | warning: some numeric feature ids do not exist and will be skipped: " . var_export($missingIds, true) . "\n", FILE_APPEND | LOCK_EX);
                    }
                }

                // Resolve names to ids (case-insensitive)
                if (count($names) > 0) {
                    // prepare placeholders and lower the comparison
                    $placeholders = implode(', ', array_fill(0, count($names), '?'));
                    $lowerCols = "LOWER(" . $this->featuresNameCol . ")";
                    $sql = "SELECT id, LOWER(" . $this->featuresNameCol . ") as lname FROM " . $this->featuresTable . " WHERE $lowerCols IN ($placeholders)";
                    $lowerNames = array_map(function($n){ return mb_strtolower($n, 'UTF-8'); }, $names);
                    $checkStmt = $this->pdo->prepare($sql);
                    $checkStmt->execute($lowerNames);
                    $rowsFound = $checkStmt->fetchAll(PDO::FETCH_ASSOC);
                    $nameToId = [];
                    foreach ($rowsFound as $r) {
                        $nameToId[$r['lname']] = (int)$r['id'];
                    }
                    foreach ($names as $nm) {
                        $ln = mb_strtolower($nm, 'UTF-8');
                        if (isset($nameToId[$ln])) {
                            $existing[] = $nameToId[$ln];
                        } else {
                            $missing[] = $nm;
                        }
                    }

                    // Se não encontrou por nome, tenta criar automaticamente em `features`
                    // para manter a persistência mesmo quando vier de fallback do frontend.
                    if (count($missing) > 0 && $this->featuresTable === 'features' && $this->tableHasColumn('features', 'category')) {
                        $insFeature = $this->pdo->prepare("INSERT INTO features (name, category) VALUES (?, ?) ON CONFLICT (category, name) DO NOTHING");
                        foreach ($missing as $nm) {
                            try {
                                $insFeature->execute([$nm, 'empreendimento_infraestruturas']);
                            } catch (PDOException $innerCreate) {
                                @file_put_contents($logFile, "$timestamp | warning: failed creating missing feature '$nm': " . $innerCreate->getMessage() . "\n", FILE_APPEND | LOCK_EX);
                            }
                        }

                        // Recarrega IDs para os nomes que acabaram de ser criados.
                        $missingLower = array_map(function($n){ return mb_strtolower($n, 'UTF-8'); }, $missing);
                        $placeholders2 = implode(', ', array_fill(0, count($missingLower), '?'));
                        $sql2 = "SELECT id, LOWER(name) as lname FROM features WHERE LOWER(name) IN ($placeholders2)";
                        $reloadStmt = $this->pdo->prepare($sql2);
                        $reloadStmt->execute($missingLower);
                        $reloaded = $reloadStmt->fetchAll(PDO::FETCH_ASSOC);
                        $reloadedMap = [];
                        foreach ($reloaded as $r2) {
                            $reloadedMap[$r2['lname']] = (int)$r2['id'];
                        }

                        $stillMissing = [];
                        foreach ($missing as $nm) {
                            $ln = mb_strtolower($nm, 'UTF-8');
                            if (isset($reloadedMap[$ln])) {
                                $existing[] = $reloadedMap[$ln];
                            } else {
                                $stillMissing[] = $nm;
                            }
                        }
                        $missing = $stillMissing;
                    }

                    if (count($missing) > 0) {
                        @file_put_contents($logFile, "$timestamp | warning: some feature names do not exist and will be skipped: " . var_export($missing, true) . "\n", FILE_APPEND | LOCK_EX);
                    }
                }

                // final unique existing ids
                $existing = array_values(array_unique(array_map('intval', $existing)));

                if (count($existing) > 0) {
                    $ins = $this->pdo->prepare("INSERT INTO project_features (project_id, feature_id) VALUES (?, ?)");
                    foreach ($existing as $fid) {
                        try {
                            @file_put_contents($logFile, "$timestamp | about to insert project_feature project=$projectId feature=$fid\n", FILE_APPEND | LOCK_EX);
                            $ins->execute([$projectId, $fid]);
                            @file_put_contents($logFile, "$timestamp | inserted project_feature project=$projectId feature=$fid\n", FILE_APPEND | LOCK_EX);
                            $inserted++;
                        } catch (PDOException $inner) {
                            @file_put_contents($logFile, "$timestamp | insert failed for feature $fid: " . $inner->getMessage() . "\n", FILE_APPEND | LOCK_EX);
                            // continue with next id
                        }
                    }
                } else {
                    @file_put_contents($logFile, "$timestamp | no existing feature ids found to insert\n", FILE_APPEND | LOCK_EX);
                }

                @file_put_contents($logFile, "$timestamp | inserted count: $inserted\n", FILE_APPEND | LOCK_EX);

                $this->pdo->commit();
                return true;
            } catch (PDOException $e) {
                $this->pdo->rollBack();
                @file_put_contents($logFile, "$timestamp | syncProjectFeatures exception: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n", FILE_APPEND | LOCK_EX);
                // Don't rethrow to avoid 500; caller should handle false return
                return false;
            }
        }
        return true;
    }

    public function getAll()
    {
        $stmt = $this->pdo->query("SELECT * FROM projects");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // Decode JSON fields if present
        foreach ($rows as &$row) {
            if (isset($row['features'])) {
                $decoded = json_decode($row['features'], true);
                $row['features'] = $decoded === null ? [] : $decoded;
            }
            $row['projectFeatures'] = $this->fetchProjectFeaturesSafe($row['id']);
            // also keep features key for backward compatibility (array of ids)
            $row['features'] = array_map(fn($r) => $r['id'], $row['projectFeatures']);
        }
        return $rows;
    }

    public function getById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM projects WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && isset($row['features'])) {
            $decoded = json_decode($row['features'], true);
            $row['features'] = $decoded === null ? [] : $decoded;
        }
        if ($row) {
            $row['projectFeatures'] = $this->fetchProjectFeaturesSafe($row['id']);
            $row['features'] = array_map(fn($r) => $r['id'], $row['projectFeatures']);
        }
        return $row;
    }

    public function getByProperty($propertyId)
    {
        // Tenta buscar por property_id caso a coluna exista; senão retorna array vazio
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM projects WHERE property_id = ?");
            $stmt->execute([$propertyId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            return [];
        }
    }

    public function create($data)
    {
        // Remove nested collections that belong to other endpoints (towers, units)
        if (isset($data['towers'])) {
            @file_put_contents(__DIR__ . '/../../api/logs/projects.log', date('Y-m-d H:i:s') . " | create payload contained 'towers' - removed before insert\n", FILE_APPEND | LOCK_EX);
            unset($data['towers']);
        }
        if (isset($data['units'])) {
            @file_put_contents(__DIR__ . '/../../api/logs/projects.log', date('Y-m-d H:i:s') . " | create payload contained 'units' - removed before insert\n", FILE_APPEND | LOCK_EX);
            unset($data['units']);
        }
        // Mapear diferentes chaves vindas do frontend para os nomes das colunas
        $property_type = $data['property_type'] ?? $data['propertyType'] ?? 'project';
        $project_name = $data['project_name'] ?? $data['projectName'] ?? null;
        $developer_name = $data['developer_name'] ?? $data['developerName'] ?? null;
        $project_type = $data['project_type'] ?? $data['projectType'] ?? null;
        $project_status = $data['project_status'] ?? $data['projectStatus'] ?? $data['status'] ?? null;
        $endereco = $data['endereco'] ?? $data['address'] ?? null;
        $bairro = $data['bairro'] ?? $data['neighborhood'] ?? null;
        $cidade = $data['cidade'] ?? $data['city'] ?? null;
        $delivery_date = $data['delivery_date'] ?? $data['deliveryDate'] ?? null;
        $image = $data['image'] ?? $data['image_url'] ?? $data['imageUrl'] ?? null;

        // Build insert dynamically to include optional 'features' column
        $fields = ['property_type', 'project_name', 'developer_name', 'project_type', 'project_status', 'endereco', 'bairro', 'cidade', 'delivery_date', 'image'];
        $placeholders = array_fill(0, count($fields), '?');
        $values = [$property_type, $project_name, $developer_name, $project_type, $project_status, $endereco, $bairro, $cidade, $delivery_date, $image];

        if ($this->columnExists('features')) {
            $fields[] = 'features';
            $placeholders[] = '?';
            $values[] = isset($data['features']) ? json_encode($data['features']) : json_encode([]);
        }

        $sql = "INSERT INTO projects (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        $lastId = $this->pdo->lastInsertId();

        // If features were provided and relational table exists, sync them
        if (isset($data['features'])) {
            $this->syncProjectFeatures($lastId, $data['features']);
        }

        return $lastId;
    }

    public function update($id, $data)
    {
        // Build dynamic update: only update fields present in payload and existing in DB
    $logFile = __DIR__ . '/../../api/logs/projects.log';
    $timestamp = date('Y-m-d H:i:s');
        // Remove nested collections that belong to other endpoints
        if (isset($data['towers'])) {
            @file_put_contents($logFile, "$timestamp | update payload contained 'towers' - removed before update\n", FILE_APPEND | LOCK_EX);
            unset($data['towers']);
        }
        if (isset($data['units'])) {
            @file_put_contents($logFile, "$timestamp | update payload contained 'units' - removed before update\n", FILE_APPEND | LOCK_EX);
            unset($data['units']);
        }
        $map = [
            'property_type' => $data['property_type'] ?? $data['propertyType'] ?? null,
            'project_name' => $data['project_name'] ?? $data['projectName'] ?? null,
            'developer_name' => $data['developer_name'] ?? $data['developerName'] ?? null,
            'project_type' => $data['project_type'] ?? $data['projectType'] ?? null,
            'project_status' => $data['project_status'] ?? $data['projectStatus'] ?? $data['status'] ?? null,
            'endereco' => $data['endereco'] ?? $data['address'] ?? null,
            'bairro' => $data['bairro'] ?? $data['neighborhood'] ?? null,
            'cidade' => $data['cidade'] ?? $data['city'] ?? null,
            'delivery_date' => $data['delivery_date'] ?? $data['deliveryDate'] ?? null,
            'image' => $data['image'] ?? $data['image_url'] ?? $data['imageUrl'] ?? null,
            'zip_code' => $data['zip_code'] ?? $data['zipCode'] ?? $data['cep'] ?? null,
            'nome' => $data['project_name'] ?? $data['projectName'] ?? null,
        ];

        $fields = [];
        $values = [];

        foreach ($map as $col => $val) {
            // only include if value provided and column exists in DB
            if ($val !== null && $this->columnExists($col)) {
                $fields[] = "$col = ?";
                $values[] = $val;
            }
        }

        // Include features if present and column exists
        if ($this->columnExists('features') && isset($data['features'])) {
            $fields[] = "features = ?";
            $values[] = json_encode($data['features']);
        }

        if (count($fields) === 0) {
            // Nothing to update in projects table. However, if features were provided
            // we should still sync the relational project_features table.
            if (isset($data['features'])) {
                try {
                    $this->syncProjectFeatures($id, $data['features']);
                    return true;
                } catch (PDOException $e) {
                    throw $e;
                }
            }
            return false;
        }

        $sql = "UPDATE projects SET " . implode(', ', $fields) . " WHERE id = ?";
        $values[] = $id;
        $stmt = $this->pdo->prepare($sql);
        try {
            $res = $stmt->execute($values);

            // Sync relational project_features if provided
            if (isset($data['features'])) {
                try {
                    $this->syncProjectFeatures($id, $data['features']);
                } catch (PDOException $e) {
                    // Log and return false so controller can respond without 500
                    @file_put_contents($logFile, date('Y-m-d H:i:s') . " | syncProjectFeatures failed inside update: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n", FILE_APPEND | LOCK_EX);
                    return false;
                }
            }

            return $res;
        } catch (PDOException $e) {
            // Rethrow to be caught by controller/public endpoint which logs
            throw $e;
        }
    }

    public function delete($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM projects WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
