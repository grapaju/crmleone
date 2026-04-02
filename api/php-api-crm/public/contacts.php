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
require_once '../src/controllers/ContactController.php';

$db = getDatabaseConnection();
$contactController = new ContactController($db);

$requestMethod = $_SERVER['REQUEST_METHOD'];

switch ($requestMethod) {
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $result = $contactController->create($data);
        echo $result
            ? json_encode(['message' => 'Contato criado com sucesso'])
            : json_encode(['error' => 'Erro ao criar contato']);
        if (!$result) http_response_code(400);
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        $success = $id ? $contactController->update($id, $data) : false;
        echo $success
            ? json_encode(['message' => 'Contato atualizado com sucesso'])
            : json_encode(['error' => 'Erro ao atualizar contato']);
        if (!$success) http_response_code(400);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        $success = $id ? $contactController->delete($id) : false;
        echo $success
            ? json_encode(['message' => 'Contato removido com sucesso'])
            : json_encode(['error' => 'Erro ao remover contato']);
        if (!$success) http_response_code(400);
        break;

    case 'GET':
        if (isset($_GET['id'])) {
            $contact = $contactController->read($_GET['id']);
            echo json_encode($contact ?: []);
        } else {
            $contacts = $contactController->readAll();
            echo json_encode($contacts ?: []);
        }
        break;
}
