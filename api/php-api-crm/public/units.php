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
require_once '../src/controllers/UnitController.php';

$db = getDatabaseConnection();
$controller = new UnitController($db);

$method = $_SERVER['REQUEST_METHOD'];

// prepare logs path early so any debug writes work
$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/units.log';

// Only attempt to read/parse request body for methods that send a body
$rawBody = '';
$input = null;
if (in_array($method, ['POST', 'PUT'])) {
    // For special action recompute_cub we allow empty body without JSON parsing
    $isRecompute = ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'recompute_cub');
    $rawBody = file_get_contents('php://input');
    if (!$isRecompute) {
        $trimmed = trim($rawBody);
        if ($trimmed === '') {
            $input = [];
        } else {
            $input = json_decode($rawBody, true);
            if ($input === null) {
                $clean = @iconv('UTF-8', 'UTF-8//IGNORE', $rawBody);
                if ($clean !== false) {
                    @file_put_contents($logFile, date('Y-m-d H:i:s') . " | attempted iconv cleaned body: " . $clean . "\n", FILE_APPEND | LOCK_EX);
                    $decodedClean = json_decode($clean, true);
                    if (is_array($decodedClean)) {
                        $input = $decodedClean;
                    }
                }
            }
            if ($input === null) {
                $clean2 = str_replace('\\', '', $rawBody);
                $clean2 = preg_replace('/\{\s+/', '{', $clean2);
                $clean2 = preg_replace('/\s+\}/', '}', $clean2);
                $clean2 = preg_replace('/\s*:\s*/', ':', $clean2);
                @file_put_contents($logFile, date('Y-m-d H:i:s') . " | attempted second-pass clean body: " . $clean2 . "\n", FILE_APPEND | LOCK_EX);
                $decoded2 = json_decode($clean2, true);
                if (is_array($decoded2)) {
                    $input = $decoded2;
                }
            }
            if ($input === null) {
                @file_put_contents($logFile, date('Y-m-d H:i:s') . " | invalid JSON payload, aborting request\n", FILE_APPEND | LOCK_EX);
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON payload']);
                exit;
            }
        }
    } else {
        // recompute: do not require/parse JSON
        $input = [];
    }
    @file_put_contents($logFile, date('Y-m-d H:i:s') . " | raw body: " . $rawBody . "\n", FILE_APPEND | LOCK_EX);
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'cub_history') {
                $unitId = isset($_GET['unit_id']) ? $_GET['unit_id'] : null;
                echo json_encode($controller->cubHistory($unitId));
            } elseif (isset($_GET['id'])) {
                echo json_encode($controller->show($_GET['id']));
            } elseif (isset($_GET['obra_id']) || isset($_GET['project_id'])) {
                $proj = $_GET['obra_id'] ?? $_GET['project_id'];
                // log GET param for debugging
                @file_put_contents($logFile, date('Y-m-d H:i:s') . " | GET byProject called with proj=" . var_export($proj, true) . "\n", FILE_APPEND | LOCK_EX);
                $result = $controller->byProject($proj);
                @file_put_contents($logFile, date('Y-m-d H:i:s') . " | byProject result type=" . gettype($result) . "\n", FILE_APPEND | LOCK_EX);
                echo json_encode($result);
            } else {
                echo json_encode($controller->index());
            }
            break;
        case 'POST':
            // rota especial: /units.php?action=recompute_cub
            if (isset($_GET['action']) && $_GET['action'] === 'recompute_cub') {
                $towerId = isset($_GET['tower_id']) ? $_GET['tower_id'] : null;
                $res = $controller->recomputeCub($towerId);
                echo json_encode(['data' => $res]);
                break;
            }
            $id = $controller->store($input);
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
    // write to local units log for debugging
    if (!isset($logFile)) {
        $logDir = __DIR__ . '/../logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        $logFile = $logDir . '/units.log';
    }
    @file_put_contents($logFile, date('Y-m-d H:i:s') . " | Exception: " . $ex->getMessage() . " | Payload: " . $rawBody . "\n" . $ex->getTraceAsString() . "\n---\n", FILE_APPEND | LOCK_EX);
    error_log($ex->getMessage());
    echo json_encode(['error' => 'Internal server error']);
}
