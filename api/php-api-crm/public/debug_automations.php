<?php
require_once __DIR__ . '/../src/config/Database.php';
header('Content-Type: application/json; charset=utf-8');
try {
    $db = getDatabaseConnection();
    $stmt = $db->prepare("SELECT id, table_id, dia_mes AS dayOfMonth, hora_envio, recipients, status FROM automations ORDER BY id DESC");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['count' => count($rows), 'rows' => $rows], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
