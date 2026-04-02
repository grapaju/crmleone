<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/config/Database.php';

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = getDatabaseConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // return last 50 history entries (including type when present)
        $stmt = $db->prepare("SELECT id, table_id, date, channel, recipients, status, `type` FROM history ORDER BY date DESC LIMIT 50");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        respond($rows);
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) respond(['error' => 'Payload inválido'], 400);

        $tableId = $data['tableId'] ?? $data['table_id'] ?? null;
        $channel = $data['channel'] ?? 'email';
        $recipients = $data['recipients'] ?? '';
        // optional type: 'manual' or 'automation'
        $type = $data['type'] ?? null;
        if (is_array($recipients)) {
            // accept array of names or emails
            $recipients = implode(',', array_slice($recipients, 0, 100));
        }
        $status = $data['status'] ?? 'Enviado';
        if ($type !== null) {
            $stmt = $db->prepare("INSERT INTO history (table_id, channel, recipients, status, `type`) VALUES (:table_id, :channel, :recipients, :status, :type)");
            $stmt->execute([':table_id' => $tableId, ':channel' => $channel, ':recipients' => $recipients, ':status' => $status, ':type' => $type]);
        } else {
            $stmt = $db->prepare("INSERT INTO history (table_id, channel, recipients, status) VALUES (:table_id, :channel, :recipients, :status)");
            $stmt->execute([':table_id' => $tableId, ':channel' => $channel, ':recipients' => $recipients, ':status' => $status]);
        }
        respond(['success' => true]);
    }

    if ($method === 'DELETE') {
        // optional: accept id param to delete
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $db->prepare("DELETE FROM history WHERE id = :id");
            $stmt->execute([':id' => $id]);
            respond(['success' => true]);
        }
        respond(['success' => true]);
    }

    respond(['error' => 'Método não suportado'], 405);
} catch (Exception $e) {
    respond(['error' => 'server error', 'message' => $e->getMessage()], 500);
}
