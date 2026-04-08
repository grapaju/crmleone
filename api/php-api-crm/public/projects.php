<?php
// Supress warnings/notices to avoid corrupting JSON responses
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);


header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Responder preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Retornar sem corpo para requisições preflight
    http_response_code(204);
    exit;
}

require_once '../src/config/database.php';
// Logs devem ir para api/logs (symlink para .deploy/shared/logs no deploy)
$logDir = __DIR__ . '/logs';
if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
$logFile = $logDir . '/projects.log';
// Try to invalidate opcache for development so changes are picked up immediately
$projectModelPath = realpath(__DIR__ . '/../src/models/Project.php');
if ($projectModelPath && function_exists('opcache_invalidate')) {
    @opcache_invalidate($projectModelPath, true);
    @file_put_contents($logFile, date('Y-m-d H:i:s') . " | opcache_invalidate called for $projectModelPath\n", FILE_APPEND | LOCK_EX);
}
require_once '../src/controllers/ProjectController.php';

$method = $_SERVER['REQUEST_METHOD'];
$rawBody = file_get_contents("php://input");
$input = json_decode($rawBody, true);
// Log raw body for debugging PUT behavior (temporary)
@file_put_contents($logFile, date('Y-m-d H:i:s') . " | raw body: " . $rawBody . "\n", FILE_APPEND | LOCK_EX);
// Fallback: if json_decode failed but $_REQUEST has data (some clients), use it
if ($input === null) {
    if (!empty($_REQUEST)) {
        $input = $_REQUEST;
        @file_put_contents($logFile, date('Y-m-d H:i:s') . " | fallback to \\$_REQUEST: " . json_encode($input) . "\n", FILE_APPEND | LOCK_EX);
    } else {
        @file_put_contents($logFile, date('Y-m-d H:i:s') . " | json_decode returned null and \\$_REQUEST empty\n", FILE_APPEND | LOCK_EX);
    }
}

// If decode failed and raw body contains 'features', try a permissive cleanup and decode
if (($input === null || !is_array($input) || (empty($input['features']) && stripos($rawBody, 'features') !== false))) {
    $clean = str_replace('\\', '', $rawBody);
    $clean = preg_replace('/\{\s+/', '{', $clean);
    $clean = preg_replace('/\s+\}/', '}', $clean);
    $clean = preg_replace('/\s*:\s*/', ':', $clean);
    @file_put_contents($logFile, date('Y-m-d H:i:s') . " | attempting cleaned body: " . $clean . "\n", FILE_APPEND | LOCK_EX);
    $decodedClean = json_decode($clean, true);
    @file_put_contents($logFile, date('Y-m-d H:i:s') . " | cleaned decode result: " . var_export($decodedClean, true) . "\n", FILE_APPEND | LOCK_EX);
    if ($decodedClean !== null && is_array($decodedClean)) {
        $input = $decodedClean;
    }
}
$db = getDatabaseConnection();
$controller = new ProjectController($db);

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                echo json_encode($controller->show($_GET['id']));
            } elseif (isset($_GET['property_id'])) {
                echo json_encode($controller->byProperty($_GET['property_id']));
            } else {
                echo json_encode($controller->index());
            }
            break;

        case 'POST':
            // Filtrar campos que não pertencem diretamente à tabela projects
            $filtered = $input ?? [];
            unset($filtered['towers'], $filtered['units']);
            if (!isset($filtered['features']) || !is_array($filtered['features'])) $filtered['features'] = [];
            $id = $controller->store($filtered);
            echo json_encode(["message" => "Projeto criado com sucesso", "id" => $id]);
            break;

        case 'PUT':
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(["error" => "ID não informado"]);
                exit;
            }
            // Filtrar campos que não pertencem diretamente à tabela projects
            $filtered = $input ?? [];
            unset($filtered['towers'], $filtered['units']);
            if (isset($filtered['features']) && !is_array($filtered['features'])) $filtered['features'] = [];

            // Permissive extraction: if features not present in filtered payload but
            // raw body contains the word 'features', try to extract an array-like substring
            // (this helps when clients like PowerShell escape or mangle the JSON)
            if ((empty($filtered['features']) || !isset($filtered['features'])) && !empty($rawBody) && stripos($rawBody, 'features') !== false) {
                $rawNoSlashes = str_replace('\\', '', $rawBody);
                // Try to extract the first array literal following 'features'
                $matches = [];
                if (preg_match('/features\s*[:=]\s*(\[[^\]]*\])/', $rawNoSlashes, $matches) || preg_match('/"features"\s*:\s*(\[[^\]]*\])/', $rawNoSlashes, $matches)) {
                    $arrJson = $matches[1];
                    $decodedArr = json_decode($arrJson, true);
                    @file_put_contents($logFile, date('Y-m-d H:i:s') . " | extracted features from raw body: " . $arrJson . " -> " . var_export($decodedArr, true) . "\n", FILE_APPEND | LOCK_EX);
                    if (is_array($decodedArr)) {
                        $filtered['features'] = $decodedArr;
                    }
                } else {
                    @file_put_contents($logFile, date('Y-m-d H:i:s') . " | features present but extraction regex didn't match. rawNoSlashes: " . $rawNoSlashes . "\n", FILE_APPEND | LOCK_EX);
                }
            }
            // Debug: gravar payload filtrado antes do update
            @file_put_contents($logFile, date('Y-m-d H:i:s') . " | PUT filtered payload: " . json_encode($filtered) . "\n", FILE_APPEND | LOCK_EX);

            $res = $controller->update($_GET['id'], $filtered);

            @file_put_contents($logFile, date('Y-m-d H:i:s') . " | controller->update returned: " . var_export($res, true) . "\n", FILE_APPEND | LOCK_EX);

            if ($res === false) {
                http_response_code(400);
                echo json_encode(["error" => "Erro ao atualizar projeto. Verifique logs em logs/projects.log para detalhes."]);
            } else {
                echo json_encode(["message" => "Projeto atualizado com sucesso"]);
            }
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(["error" => "ID não informado"]);
                exit;
            }
            $controller->destroy($_GET['id']);
            echo json_encode(["message" => "Projeto excluído com sucesso"]);
            break;

        default:
            http_response_code(405);
            echo json_encode(["error" => "Método não permitido"]);
            break;
    }
} catch (Throwable $ex) {
    http_response_code(500);

    // Garantir que o diretório de logs exista e escrever a exceção com timestamp
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/projects.log';
    $payload = json_encode($input);
    $message = date('Y-m-d H:i:s') . " | Exception: " . $ex->getMessage() . " | Payload: " . $payload . "\n" . $ex->getTraceAsString() . "\n---\n";
    @file_put_contents($logFile, $message, FILE_APPEND | LOCK_EX);

    // Retornar mensagem genérica ao cliente para não vazar detalhes sensíveis
    echo json_encode(["error" => "Internal server error", "code" => 500]);
}
