<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../src/config/database.php';
require_once __DIR__ . '/../src/controllers/FeatureController.php';

// create PDO connection expected by controllers
try {
    $pdo = getDatabaseConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection error", "details" => $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents("php://input"), true);
$controller = new FeatureController($pdo);

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            echo json_encode($controller->show($_GET['id']));
        } else {
            echo json_encode($controller->index());
        }
        break;

    case 'POST':
        $id = $controller->store($input);
        echo json_encode(["message" => "Característica criada com sucesso", "id" => $id]);
        break;

    case 'PUT':
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "ID não informado"]);
            exit;
        }
        $controller->update($_GET['id'], $input);
        echo json_encode(["message" => "Característica atualizada com sucesso"]);
        break;

    case 'DELETE':
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "ID não informado"]);
            exit;
        }
        $controller->destroy($_GET['id']);
        echo json_encode(["message" => "Característica excluída com sucesso"]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Método não permitido"]);
        break;
}
