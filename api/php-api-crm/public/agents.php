<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once '../src/config/database.php';
require_once '../src/controllers/AgentController.php';

$db = getDatabaseConnection();
$agentController = new AgentController($db);

$requestMethod = $_SERVER['REQUEST_METHOD'];

switch ($requestMethod) {
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $result = $agentController->createAgent($data);
        echo $result
            ? json_encode(['message' => 'Agente criado com sucesso'])
            : json_encode(['error' => 'Erro ao criar agente']);
        if (!$result) http_response_code(400);
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        $success = $id ? $agentController->updateAgent($id, $data) : false;
        echo $success
            ? json_encode(['message' => 'Agente atualizado com sucesso'])
            : json_encode(['error' => 'Erro ao atualizar agente']);
        if (!$success) http_response_code(400);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        $success = $id ? $agentController->deleteAgent($id) : false;
        echo $success
            ? json_encode(['message' => 'Agente removido com sucesso'])
            : json_encode(['error' => 'Erro ao remover agente']);
        if (!$success) http_response_code(400);
        break;

    case 'GET':
        if (isset($_GET['id'])) {
            $agent = $agentController->getAgentById($_GET['id']);
            echo json_encode($agent);
        } else {
            $agents = $agentController->getAllAgents();
            echo json_encode($agents);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
        break;
}
