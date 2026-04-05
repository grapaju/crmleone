<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// Garantir timezone do PHP está definida para evitar ambiguidade ao formatar datas
// Você pode sobrescrever definindo a variável de ambiente PHP_APP_TZ, por exemplo 'America/Sao_Paulo'
$tz = getenv('PHP_APP_TZ') ?: 'America/Sao_Paulo';
date_default_timezone_set($tz);


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/config/database.php';
require_once __DIR__ . '/../src/controllers/CalendarController.php';

// Conexão com DB
$db = getDatabaseConnection();
$controller = new CalendarController($db);

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

// Resposta JSON
function respond($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

switch ($method) {
    case 'GET':
        if ($id) {
            $result = $controller->getAppointmentById($id);
            if ($result) {
                respond($result);
            } else {
                respond(["error" => "Compromisso não encontrado"], 404);
            }
        } else {
            $result = $controller->getAppointments();
            respond($result);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) respond(["error" => "JSON inválido"], 400);
        try {
            $result = $controller->createAppointment($data);
            if ($result) {
                respond($result, 201);
            } else {
                respond(["error" => "Erro ao criar compromisso"], 500);
            }
        } catch (Exception $e) {
            respond(["error" => $e->getMessage()], 400);
        }
        break;

    case 'PUT':
        if (!$id) respond(["error" => "ID é obrigatório"], 400);
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) respond(["error" => "JSON inválido"], 400);
        try {
            $result = $controller->updateAppointment($id, $data);
            if ($result) {
                respond($result);
            } else {
                respond(["error" => "Erro ao atualizar compromisso"], 500);
            }
        } catch (Exception $e) {
            respond(["error" => $e->getMessage()], 400);
        }
        break;

    case 'DELETE':
        if (!$id) respond(["error" => "ID é obrigatório"], 400);

        $ok = $controller->deleteAppointment($id);
        if ($ok) {
            respond(["success" => true]);
        } else {
            respond(["error" => "Erro ao deletar compromisso"], 500);
        }
        break;

    case 'OPTIONS':
        http_response_code(204);
        break;

    default:
        respond(["error" => "Método não suportado"], 405);
        break;
}
