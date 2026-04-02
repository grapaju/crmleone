<?php
class SalesTable
{
    private $conn;
    private $table = "sales_tables";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function getAll()
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} ORDER BY created_at DESC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Converter attachments JSON → array
        foreach ($rows as &$row) {
            if (array_key_exists('attachments', $row) && $row['attachments'] !== null && $row['attachments'] !== '') {
                $decoded = @json_decode($row['attachments'], true);
                $row['attachments'] = is_array($decoded) ? $decoded : [];
            } else {
                $row['attachments'] = [];
            }
        }

        return $rows;
    }

    public function getById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            if (array_key_exists('attachments', $row) && $row['attachments'] !== null && $row['attachments'] !== '') {
                $decoded = @json_decode($row['attachments'], true);
                $row['attachments'] = is_array($decoded) ? $decoded : [];
            } else {
                $row['attachments'] = [];
            }
        }

        return $row;
    }

    public function create($data)
    {
        $stmt = $this->conn->prepare(
            "INSERT INTO {$this->table} (name, description, observations, project_id, attachments) 
             VALUES (:name, :description, :observations, :project_id, :attachments)"
        );

        $stmt->bindValue(':name', $data['name'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':description', $data['description'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':observations', $data['observations'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':project_id', $data['project_id'] ?? null, PDO::PARAM_INT);

    // Sempre salvar JSON (dedupe antes de salvar)
    $atts = is_string($data['attachments'] ?? '') ? json_decode($data['attachments'], true) : ($data['attachments'] ?? []);
    $cleanAtts = $this->dedupeAttachments(is_array($atts) ? $atts : []);
    $attachmentsJson = json_encode($cleanAtts ?? []);
        $stmt->bindValue(':attachments', $attachmentsJson, PDO::PARAM_STR);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function update($id, $data)
    {
        // Buscar registros existentes para preservar anexos
        $existing = $this->getById($id);
        if (!$existing) {
            return false;
        }
        // Preserve existing scalar fields when they are not provided in the payload
        $fieldsToPreserve = ['name', 'description', 'observations', 'project_id'];
        foreach ($fieldsToPreserve as $f) {
            if (!array_key_exists($f, $data)) {
                $data[$f] = $existing[$f] ?? null;
            }
        }

        // Normalize existing attachments to array
        $existingAttachments = [];
        if (isset($existing['attachments'])) {
            if (is_array($existing['attachments'])) {
                $existingAttachments = $existing['attachments'];
            } elseif (is_string($existing['attachments'])) {
                $decoded = @json_decode($existing['attachments'], true);
                $existingAttachments = is_array($decoded) ? $decoded : [];
            }
        }

        // If attachments were provided in payload, treat them as authoritative (user's desired final list)
        if (array_key_exists('attachments', $data)) {
            $newAtt = is_array($data['attachments']) ? $data['attachments'] : [];
            // Deduplicate the provided attachments and use them as the final set
            $data['attachments'] = $this->dedupeAttachments($newAtt);
        } else {
            // keep existing attachments when payload didn't include attachments
            $data['attachments'] = $existingAttachments;
        }

        $stmt = $this->conn->prepare(
            "UPDATE {$this->table} 
             SET name=:name, description=:description, observations=:observations, project_id=:project_id, attachments=:attachments 
             WHERE id=:id"
        );

        $stmt->bindValue(':name', $data['name'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':description', $data['description'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':observations', $data['observations'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':project_id', $data['project_id'] ?? null, PDO::PARAM_INT);

        // Sempre salvar JSON
        $attachmentsJson = is_string($data['attachments'] ?? '')
            ? $data['attachments']
            : json_encode($data['attachments'] ?? []);
        $stmt->bindValue(':attachments', $attachmentsJson, PDO::PARAM_STR);

        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        return $stmt->execute();
    }

    /**
     * Remove duplicates from attachments array.
     * Prefere 'path' como chave única, senão usa name|size.
     */
    private function dedupeAttachments($attachments)
    {
        if (!is_array($attachments)) return [];
        $map = [];
        foreach ($attachments as $att) {
            if (!is_array($att)) continue;
            $key = null;
            if (!empty($att['path'])) {
                $key = (string)$att['path'];
            } else {
                $name = isset($att['name']) ? (string)trim($att['name']) : '';
                $size = isset($att['size']) ? (string)trim($att['size']) : '';
                if ($name === '' && $size === '') continue;
                $key = $name . '|' . $size;
            }
            if ($key !== null && !array_key_exists($key, $map)) {
                // Normalize minimal fields
                $map[$key] = [
                    'name' => $att['name'] ?? null,
                    'size' => $att['size'] ?? null,
                    'path' => $att['path'] ?? null,
                ];
            }
        }
        return array_values($map);
    }

    public function delete($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM {$this->table} WHERE id=?");
        return $stmt->execute([$id]);
    }
}
