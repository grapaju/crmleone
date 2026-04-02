<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once '../src/config/database.php';
require_once '../src/controllers/LeadController.php';

$db = getDatabaseConnection();
$controller = new LeadController($db);

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['top'])) {
            echo json_encode($controller->top($_GET['top']));
        } elseif (isset($_GET['id'])) {
            echo json_encode($controller->read($_GET['id']));
        } else {
            echo json_encode($controller->readAll());
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $controller->create($data);
        if ($id) {
            // Buscar o lead recém-criado com agent_name
            $lead = $controller->read($id);
            echo json_encode($lead);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Erro ao criar lead']);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if ($id) {
            $result = $controller->update($id, $data);
            if ($result) {
                // controller->update now returns the updated lead
                echo json_encode($result);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Erro ao atualizar lead']);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'ID é obrigatório']);
        }
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if ($id && $controller->delete($id)) {
            echo json_encode(['success' => true, 'message' => 'Lead removido com sucesso']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Erro ao remover lead']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
