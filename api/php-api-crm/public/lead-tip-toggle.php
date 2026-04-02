<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}
require_once __DIR__ . '/../src/controllers/TipController.php';
require_once __DIR__ . '/../src/config/database.php';
$input = json_decode(file_get_contents('php://input'), true);
$leadId = (int)($input['leadId'] ?? 0);
$tipId = (int)($input['tipId'] ?? 0);
$ativa = (bool)($input['ativa'] ?? false);
if (!$leadId || !$tipId) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Parâmetros inválidos']);
    exit;
}
try {
    $db = getDatabaseConnection();
    $controller = new TipController($db);
    $ok = $controller->setTipStatusForLead($leadId, $tipId, $ativa);
    header('Content-Type: application/json');
    echo json_encode(['success' => (bool)$ok]);
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Falha ao atualizar dica', 'detail' => $e->getMessage()]);
}
