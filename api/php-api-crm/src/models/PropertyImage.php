<?php
class PropertyImage
{
    private $pdo;

    public function __construct($db)
    {
        $this->pdo = $db;
    }

    public function getAll()
    {
        $stmt = $this->pdo->query("SELECT * FROM property_images");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM property_images WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getByProperty($propertyId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM property_images WHERE property_id = ?");
        $stmt->execute([$propertyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    public function getByProject($projectId)
    {
    $stmt = $this->pdo->prepare("SELECT * FROM property_images WHERE project_id = ?");
    $stmt->execute([$projectId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByUnit($unitId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM property_images WHERE unit_id = ?");
        $stmt->execute([$unitId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create($data)
    {
        // se a imagem for marcada como primary, garantir unicidade por propriedade
        $isPrimary = !empty($data['is_primary']) ? 1 : 0;
        $propertyId = $data['property_id'] ?? null;
        $projectId = $data['project_id'] ?? null;
        $unitId = $data['unit_id'] ?? null;

        // early logging: function called and incoming data
        $logFile = __DIR__ . '/../../logs/property_images.log';
        file_put_contents($logFile, date(DATE_ATOM) . " - create called with data: " . json_encode($data) . PHP_EOL, FILE_APPEND);
        if (empty($propertyId) && empty($projectId) && empty($unitId)) {
            file_put_contents($logFile, date(DATE_ATOM) . " - WARNING: no property_id/project_id/unit_id provided" . PHP_EOL, FILE_APPEND);
        }

        try {
            // if marking primary, unset other primaries in the same scope (property OR project OR unit)
            if ($isPrimary) {
                $this->pdo->beginTransaction();
                if ($propertyId) {
                    $unset = $this->pdo->prepare("UPDATE property_images SET is_primary = 0 WHERE property_id = ?");
                    $unset->execute([$propertyId]);
                } elseif ($projectId) {
                    $unset = $this->pdo->prepare("UPDATE property_images SET is_primary = 0 WHERE project_id = ?");
                    $unset->execute([$projectId]);
                } elseif ($unitId) {
                    $unset = $this->pdo->prepare("UPDATE property_images SET is_primary = 0 WHERE unit_id = ?");
                    $unset->execute([$unitId]);
                }
            }

            $stmt = $this->pdo->prepare(
                "INSERT INTO property_images (property_id, project_id, unit_id, image_url, is_primary) 
                 VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $propertyId,
                $projectId,
                $unitId,
                $data['image_url'],
                $isPrimary
            ]);

            // logging: params + SQL errorInfo or insert id
            $logFile = __DIR__ . '/../../logs/property_images.log';
            $insertParams = [
                'property_id' => $propertyId,
                'project_id' => $projectId,
                'unit_id' => $unitId,
                'image_url' => $data['image_url'] ?? null,
                'is_primary' => $isPrimary
            ];
            file_put_contents($logFile, date(DATE_ATOM) . " - insert params (model): " . json_encode($insertParams) . PHP_EOL, FILE_APPEND);
            $paramsLog = [
                'property_id' => $propertyId,
                'project_id' => $projectId,
                'unit_id' => $unitId,
                'image_url' => $data['image_url'] ?? null,
                'is_primary' => $isPrimary
            ];
            file_put_contents($logFile, date(DATE_ATOM) . " - insert params: " . json_encode($paramsLog) . PHP_EOL, FILE_APPEND);

            $err = $stmt->errorInfo();
            file_put_contents($logFile, date(DATE_ATOM) . " - stmt errorInfo: " . json_encode($err) . PHP_EOL, FILE_APPEND);
            if (!empty($err) && ($err[0] !== '00000' || !empty($err[1]))) {
                // SQL error
                file_put_contents($logFile, date(DATE_ATOM) . " - SQL error: " . json_encode($err) . PHP_EOL, FILE_APPEND);
                $lastId = null;
            } else {
                $lastId = $this->pdo->lastInsertId();
                file_put_contents($logFile, date(DATE_ATOM) . " - insert id: " . $lastId . PHP_EOL, FILE_APPEND);
            }

            if ($isPrimary) {
                $this->pdo->commit();
            }

            return $lastId;
        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            // log exception details
            file_put_contents($logFile, date(DATE_ATOM) . " - EXCEPTION in create: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
            file_put_contents($logFile, date(DATE_ATOM) . " - Trace: " . $e->getTraceAsString() . PHP_EOL, FILE_APPEND);
            file_put_contents($logFile, date(DATE_ATOM) . " - data at exception: " . json_encode($data) . PHP_EOL, FILE_APPEND);
            throw $e;
        }
    }

    public function update($id, $data)
    {
        $isPrimary = !empty($data['is_primary']) ? 1 : 0;
        $propertyId = $data['property_id'] ?? null;
        $projectId = $data['project_id'] ?? null;
        $unitId = $data['unit_id'] ?? null;

        try {
            if ($isPrimary) {
                $this->pdo->beginTransaction();
                // desmarcar outras imagens no mesmo escopo
                if ($propertyId) {
                    $unset = $this->pdo->prepare("UPDATE property_images SET is_primary = 0 WHERE property_id = ? AND id <> ?");
                    $unset->execute([$propertyId, $id]);
                } elseif ($projectId) {
                    $unset = $this->pdo->prepare("UPDATE property_images SET is_primary = 0 WHERE project_id = ? AND id <> ?");
                    $unset->execute([$projectId, $id]);
                } elseif ($unitId) {
                    $unset = $this->pdo->prepare("UPDATE property_images SET is_primary = 0 WHERE unit_id = ? AND id <> ?");
                    $unset->execute([$unitId, $id]);
                }
            }

            $stmt = $this->pdo->prepare(
                "UPDATE property_images 
                 SET property_id = ?, project_id = ?, unit_id = ?, image_url = ?, is_primary = ? 
                 WHERE id = ?"
            );
            $res = $stmt->execute([
                $propertyId,
                $projectId ?? null,
                $unitId ?? null,
                $data['image_url'],
                $isPrimary,
                $id
            ]);

            if ($isPrimary) {
                $this->pdo->commit();
            }

            return $res;
        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    public function delete($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM property_images WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
