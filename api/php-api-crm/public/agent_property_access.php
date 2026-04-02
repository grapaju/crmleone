<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once '../src/config/database.php';
require_once '../src/controllers/AgentPropertyAccessController.php';

$db = getDatabaseConnection();
$controller = new AgentPropertyAccessController($db);

$method = $_SERVER['REQUEST_METHOD'];
$agentId = isset($_GET['agent_id']) ? (int)$_GET['agent_id'] : null;

switch ($method) {
    case 'GET':
        if (!$agentId) {
            http_response_code(400);
            echo json_encode(['error' => 'agent_id requerido']);
            break;
        }
        echo json_encode($controller->list($agentId));
        break;
    case 'POST':
        if (!$agentId) {
            http_response_code(400);
            echo json_encode(['error' => 'agent_id requerido']);
            break;
        }
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $res = $controller->replace($agentId, $body);
        if ($res === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Falha ao salvar permissões']);
        } else {
            echo json_encode($res);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
