<?php
require_once __DIR__ . '/../src/config/database.php';
try {
    $db = getDatabaseConnection();
    $now = new DateTime('now');
    $day = (int)$now->format('j');
    $time = $now->format('H:i:s');
    $stmt = $db->prepare("INSERT INTO automations (table_id, dia_mes, hora_envio, recipients, status) VALUES (:table_id, :dia_mes, :hora_envio, :recipients, :status)");
    $rec = json_encode([['name' => 'Test', 'email' => 'test@example.com']], JSON_UNESCAPED_UNICODE);
    $stmt->execute([':table_id' => 1, ':dia_mes' => $day, ':hora_envio' => $time, ':recipients' => $rec, ':status' => 'Ativa']);
    echo json_encode(['inserted_id' => $db->lastInsertId(), 'hora_envio' => $time]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
