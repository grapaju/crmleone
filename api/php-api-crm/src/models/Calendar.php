<?php

class Calendar
{
    private $conn;
    private $table_name = "appointments";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    // Convert incoming date strings (including ISO with timezone) to server-local MySQL datetime
    private function normalizeDates($data)
    {
        if (!is_array($data)) return $data;

        $keys = ['start', 'end'];
        foreach ($keys as $k) {
            if (isset($data[$k]) && $data[$k] !== null && $data[$k] !== '') {
                try {
                    // DateTime in PHP can parse ISO8601 strings with timezone
                    $dt = new DateTime($data[$k]);
                    // Convert to server timezone (default) so DB stores local time
                    $dt->setTimezone(new DateTimeZone(date_default_timezone_get()));
                    $data[$k] = $dt->format('Y-m-d H:i:s');
                    // validate business hours (08:00:00 - 22:00:00 inclusive)
                    $h = (int)$dt->format('H');
                    $i = (int)$dt->format('i');
                    $s = (int)$dt->format('s');
                    $secondsOfDay = $h * 3600 + $i * 60 + $s;
                    $minSeconds = 8 * 3600; // 08:00:00
                    $maxSeconds = 22 * 3600; // 22:00:00 inclusive
                    if ($secondsOfDay < $minSeconds || $secondsOfDay > $maxSeconds) {
                        throw new Exception("Horário fora do horário comercial permitido (08:00-22:00): {$data[$k]}");
                    }
                } catch (Exception $e) {
                    // Propagate exception so controller or endpoint can return a 400
                    throw $e;
                }
            } else {
                // Normalize empty strings to null
                if (isset($data[$k]) && $data[$k] === '') $data[$k] = null;
            }
        }
        return $data;
    }

    public function create($data)
    {
        // normalize possible ISO datetimes to server local 'Y-m-d H:i:s'
        $data = $this->normalizeDates($data);

        $query = "INSERT INTO {$this->table_name} 
                  (title, description, type, start, end, agent_id, lead_id, property_id, project_id, status) 
                  VALUES (:title, :description, :type, :start, :end, :agent_id, :lead_id, :property_id, :project_id, :status)";

        $stmt = $this->conn->prepare($query);


        $stmt->bindParam(":title", $data['title']);
        $stmt->bindParam(":description", $data['description']);
        $stmt->bindParam(":type", $data['type']);
        $stmt->bindParam(":start", $data['start']);
        $stmt->bindParam(":end", $data['end']);
        $stmt->bindParam(":agent_id", $data['agent_id']);
        $stmt->bindParam(":lead_id", $data['lead_id']);
        // Corrige property_id para null se não for válido
        $propertyId = isset($data['property_id']) && $data['property_id'] !== '' && $data['property_id'] !== 'none'
            ? $data['property_id']
            : null;
        if ($propertyId === null) {
            $stmt->bindValue(":property_id", null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(":property_id", $propertyId, PDO::PARAM_INT);
        }
        $stmt->bindParam(":project_id", $data['project_id']);
        $stmt->bindParam(":status", $data['status']);

        if ($stmt->execute()) {
            $saved = $this->read($this->conn->lastInsertId());
            // if associated lead_id present, recalculate lead score
            if (!empty($saved['lead_id'])) {
                require_once __DIR__ . '/Lead.php';
                $leadModel = new Lead($this->conn);
                $leadModel->calculateScore($saved['lead_id']);
            }
            return $saved;
        }
        return false;
    }

    public function readAll()
    {
        $query = "SELECT * FROM {$this->table_name} ORDER BY start DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $result ?: [];
    }

    public function read($id)
    {
        $query = "SELECT * FROM {$this->table_name} WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function update($id, $data)
    {
        // normalize possible ISO datetimes to server local 'Y-m-d H:i:s'
        $data = $this->normalizeDates($data);

        $query = "UPDATE {$this->table_name} 
                  SET title=:title, description=:description, type=:type, start=:start, end=:end,
                      agent_id=:agent_id, lead_id=:lead_id, property_id=:property_id, 
                      project_id=:project_id, status=:status, updated_at=NOW()
                  WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":title", $data['title']);
        $stmt->bindParam(":description", $data['description']);
        $stmt->bindParam(":type", $data['type']);
        $stmt->bindParam(":start", $data['start']);
        $stmt->bindParam(":end", $data['end']);
        $stmt->bindParam(":agent_id", $data['agent_id']);
        $stmt->bindParam(":lead_id", $data['lead_id']);
        $stmt->bindParam(":property_id", $data['property_id']);
        $stmt->bindParam(":project_id", $data['project_id']);
        $stmt->bindParam(":status", $data['status']);
        $stmt->bindParam(":id", $id);

        if ($stmt->execute()) {
            $saved = $this->read($id);
            if (!empty($saved['lead_id'])) {
                require_once __DIR__ . '/Lead.php';
                $leadModel = new Lead($this->conn);
                $leadModel->calculateScore($saved['lead_id']);
            }
            return $saved;
        }
        return false;
    }

    public function delete($id)
    {
        // before delete, try to fetch lead_id to recalc score after deletion
        $appt = $this->read($id);
        $query = "DELETE FROM {$this->table_name} WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $ok = $stmt->execute();
        if ($ok && !empty($appt['lead_id'])) {
            require_once __DIR__ . '/Lead.php';
            $leadModel = new Lead($this->conn);
            $leadModel->calculateScore($appt['lead_id']);
        }
        return $ok;
    }
}
