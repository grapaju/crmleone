<?php
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once '../src/config/database.php';
require_once '../src/controllers/TowerController.php';

$db = getDatabaseConnection();
$controller = new TowerController($db);

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                echo json_encode($controller->show($_GET['id']));
            } elseif (isset($_GET['obra_id']) || isset($_GET['project_id'])) {
                $proj = $_GET['obra_id'] ?? $_GET['project_id'];
                echo json_encode($controller->byProject($proj));
            } else {
                echo json_encode($controller->index());
            }
            break;
        case 'POST':
            $id = $controller->store($input);
            // return the created record for frontend convenience
            $created = $controller->show($id);
            echo json_encode($created);
            break;
        case 'PUT':
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID required']);
                exit;
            }
            $controller->update($_GET['id'], $input);
            // return the updated record
            $updated = $controller->show($_GET['id']);
            echo json_encode($updated);
            break;
        case 'DELETE':
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID required']);
                exit;
            }
            $controller->destroy($_GET['id']);
            echo json_encode(['message' => 'Deleted']);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $ex) {
    http_response_code(500);
    error_log($ex->getMessage());
    echo json_encode(['error' => 'Internal server error']);
}
