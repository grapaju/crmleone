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
require_once '../src/controllers/ImobiliariaController.php';

$db = getDatabaseConnection();
$controller = new ImobiliariaController($db);

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['id'])) {
            echo json_encode($controller->getById($_GET['id']));
        } else {
            echo json_encode($controller->getAll());
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $result = $controller->create($data);
        if ($result) {
            echo json_encode($result);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Erro ao criar imobiliária']);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if ($id && $controller->update($id, $data)) {
            echo json_encode(['message' => 'Imobiliária atualizada com sucesso']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Erro ao atualizar imobiliária']);
        }
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if ($id && $controller->delete($id)) {
            echo json_encode(['message' => 'Imobiliária removida com sucesso']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Erro ao remover imobiliária']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
