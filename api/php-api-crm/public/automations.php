<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/config/database.php';

function respond($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = getDatabaseConnection();
    $method = $_SERVER['REQUEST_METHOD'];
    $id = $_GET['id'] ?? null;

    if ($method === 'GET') {
    // include hora_envio, title/tittle and message if present; join to sales_tables to get table name
    $stmt = $db->prepare("SELECT a.id, a.table_id, a.dia_mes AS dayOfMonth, a.hora_envio, a.recipients, a.status, a.title, a.message, s.name AS tableName FROM automations a LEFT JOIN sales_tables s ON s.id = a.table_id ORDER BY a.id DESC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // try to decode recipients column if it contains JSON (recipientsList saved as JSON)
        foreach ($rows as &$r) {
            $decoded = json_decode($r['recipients'], true);
            if (is_array($decoded)) {
                // expose both a parsed recipientsList and a human-friendly recipients string
                $r['recipientsList'] = $decoded;
                $names = array_map(function($it) { return isset($it['name']) && $it['name'] !== '' ? $it['name'] : ($it['email'] ?? ''); }, $decoded);
                $r['recipients'] = implode(', ', $names);
            } else {
                $r['recipientsList'] = null;
            }
        }
        // normalize field name to sendTime for frontend compatibility, and expose title/message
        foreach ($rows as &$r) {
            if (isset($r['hora_envio'])) $r['sendTime'] = $r['hora_envio'];
            // ensure title is present
            if (!isset($r['title'])) $r['title'] = null;
            // ensure message is present
            if (!isset($r['message'])) $r['message'] = null;
        }
        respond($rows);
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) respond(['error' => 'Payload inválido'], 400);
    $tableId = $data['table_id'] ?? $data['tableId'] ?? null;
    $day = $data['dia_mes'] ?? $data['dayOfMonth'] ?? '';
    $horaEnvio = $data['hora_envio'] ?? $data['sendTime'] ?? null;
    $title = $data['title'] ?? $data['subject'] ?? $data['titulo'] ?? null;
    $message = $data['message'] ?? $data['body'] ?? null;
        // prefer recipientsList (array of {name,email}) if provided
        if (isset($data['recipientsList']) && is_array($data['recipientsList'])) {
            $recipients = json_encode($data['recipientsList'], JSON_UNESCAPED_UNICODE);
        } else {
            $recipients = $data['recipients'] ?? '';
        }
        $status = $data['status'] ?? 'Ativa';
        // attempt to insert title and message; handle optional hora_envio
        if ($horaEnvio !== null) {
            $stmt = $db->prepare("INSERT INTO automations (table_id, dia_mes, hora_envio, recipients, status, title, message) VALUES (:table_id, :dia_mes, :hora_envio, :recipients, :status, :title, :message)");
            $stmt->execute([':table_id' => $tableId, ':dia_mes' => $day, ':hora_envio' => $horaEnvio, ':recipients' => $recipients, ':status' => $status, ':title' => $title, ':message' => $message]);
        } else {
            $stmt = $db->prepare("INSERT INTO automations (table_id, dia_mes, recipients, status, title, message) VALUES (:table_id, :dia_mes, :recipients, :status, :title, :message)");
            $stmt->execute([':table_id' => $tableId, ':dia_mes' => $day, ':recipients' => $recipients, ':status' => $status, ':title' => $title, ':message' => $message]);
        }
        respond(['success' => true, 'id' => $db->lastInsertId()], 201);
    }

    if ($method === 'DELETE') {
        if (!$id) respond(['error' => 'ID é obrigatório'], 400);
        $stmt = $db->prepare("DELETE FROM automations WHERE id = :id");
        $stmt->execute([':id' => $id]);
        respond(['success' => true]);
    }

    if ($method === 'PATCH') {
        // toggle status if ?toggle=1
        if (isset($_GET['toggle']) && $_GET['toggle'] == '1' && $id) {
            $stmt = $db->prepare("SELECT status FROM automations WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) respond(['error' => 'Não encontrado'], 404);
            $new = ($row['status'] === 'Ativa') ? 'Inativa' : 'Ativa';
            $u = $db->prepare("UPDATE automations SET status = :status WHERE id = :id");
            $u->execute([':status' => $new, ':id' => $id]);
            respond(['success' => true, 'status' => $new]);
        }
        respond(['error' => 'Operação não suportada'], 400);
    }

    respond(['error' => 'Método não suportado'], 405);
} catch (Exception $e) {
    respond(['error' => 'server error', 'message' => $e->getMessage()], 500);
}
