<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$enableLogsEnv = getenv('SALES_TABLES_DEBUG');
$SALES_TABLES_DEBUG = ($enableLogsEnv !== false) ? filter_var($enableLogsEnv, FILTER_VALIDATE_BOOLEAN) : true;

require_once __DIR__ . '/../src/config/Database.php';
require_once __DIR__ . '/../src/controllers/SalesTableController.php';

$db = getDatabaseConnection();
$controller = new SalesTableController($db);

$method = $_SERVER['REQUEST_METHOD'];
// Allow HTTP method override via form field _method (used when sending multipart/form-data for PUT)
if ($method === 'POST' && !empty($_POST['_method'])) {
    $override = strtoupper(trim($_POST['_method']));
    if (in_array($override, ['PUT', 'DELETE'])) {
        $method = $override;
    }
}
$id = $_GET['id'] ?? null;

function respond($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function log_sales_tables($level, $message, $payload = null)
{
    global $SALES_TABLES_DEBUG;
    if (!$SALES_TABLES_DEBUG && strtolower($level) === 'debug') return;
    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    $logFile = $logDir . '/sales_tables.log';
    $entry = date('Y-m-d H:i:s') . " | " . strtoupper($level) . " | " . $message;
    if ($payload !== null) {
        $entry .= " | payload: " . (is_string($payload) ? $payload : json_encode($payload, JSON_UNESCAPED_UNICODE));
    }
    file_put_contents($logFile, $entry . PHP_EOL, FILE_APPEND | LOCK_EX);
}

try {
    switch ($method) {
        case 'GET':
            ob_start();
            $controller->handleRequest('GET', $id);
            $out = ob_get_clean();
            respond(json_decode($out, true));
            break;

        case 'POST':
            log_sales_tables('debug', 'incoming POST keys', ['_POST' => array_keys($_POST), '_FILES' => array_keys($_FILES)]);

            // payload
            $body = !empty($_POST['payload'])
                ? json_decode($_POST['payload'], true)
                : json_decode(file_get_contents('php://input'), true);

            if (!is_array($body)) $body = [];

            // uploads
            $uploadDir = __DIR__ . '/../uploads';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

            $attachments = [];
            if (!empty($_FILES['files'])) {
                $files = $_FILES['files'];
                $count = is_array($files['name']) ? count($files['name']) : 1;
                for ($i = 0; $i < $count; $i++) {
                    $name = is_array($files['name']) ? $files['name'][$i] : $files['name'];
                    $tmp = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
                    $size = is_array($files['size']) ? $files['size'][$i] : $files['size'];
                    // Basic validation: only PDFs and size limit
                    $maxBytes = 10 * 1024 * 1024; // 10MB
                    $finfoType = mime_content_type($tmp);
                    if ($finfoType !== 'application/pdf') {
                        log_sales_tables('warn', 'rejected upload - invalid mime', ['name' => $name, 'mime' => $finfoType]);
                        continue;
                    }
                    if ($size > $maxBytes) {
                        log_sales_tables('warn', 'rejected upload - too large', ['name' => $name, 'size' => $size]);
                        continue;
                    }

                    $safeName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', basename($name));
                    $dest = $uploadDir . '/' . $safeName;
                    if (move_uploaded_file($tmp, $dest)) {
                        $attachments[] = [
                            'name' => $name,
                            'size' => round($size / 1024 / 1024, 2) . ' MB',
                            'path' => '/uploads/' . $safeName
                        ];
                    } else {
                        log_sales_tables('error', 'failed to move uploaded file', ['name' => $name]);
                    }
                }
            }

            if (!isset($body['attachments']) || !is_array($body['attachments'])) $body['attachments'] = [];
            $body['attachments'] = array_merge($body['attachments'], $attachments);

            if (empty($body['name'])) {
                log_sales_tables('error', 'create payload missing name', $body);
                respond(['error' => 'Campo name é obrigatório'], 400);
            }

            ob_start();
            $controller->handleRequest('POST', null, $body);
            $out = ob_get_clean();
            respond(json_decode($out, true), 201);
            break;

        case 'PUT':
            if (!$id) respond(['error' => 'ID é obrigatório'], 400);

            if (!empty($_POST['payload']) && !empty($_FILES)) {
                $body = json_decode($_POST['payload'], true);
                if (!is_array($body)) $body = [];

                $uploadDir = __DIR__ . '/../uploads';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

                $attachments = [];
                if (!empty($_FILES['files'])) {
                    $files = $_FILES['files'];
                    $count = is_array($files['name']) ? count($files['name']) : 1;
                    for ($i = 0; $i < $count; $i++) {
                        $name = is_array($files['name']) ? $files['name'][$i] : $files['name'];
                        $tmp = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
                        $size = is_array($files['size']) ? $files['size'][$i] : $files['size'];
                        $safeName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', basename($name));
                        $dest = $uploadDir . '/' . $safeName;
                        if (move_uploaded_file($tmp, $dest)) {
                            $attachments[] = [
                                'name' => $name,
                                'size' => round($size / 1024 / 1024, 2) . ' MB',
                                'path' => '/uploads/' . $safeName
                            ];
                        }
                    }
                }

                if (!isset($body['attachments']) || !is_array($body['attachments'])) {
                    $body['attachments'] = [];
                }
                $body['attachments'] = array_merge($body['attachments'], $attachments);
            } else {
                $body = json_decode(file_get_contents('php://input'), true);
                if (!is_array($body)) $body = [];
            }

            ob_start();
            $controller->handleRequest('PUT', $id, $body);
            $out = ob_get_clean();
            respond(json_decode($out, true));
            break;

        case 'DELETE':
            if (!$id) respond(['error' => 'ID é obrigatório'], 400);
            ob_start();
            $controller->handleRequest('DELETE', $id);
            $out = ob_get_clean();
            respond(json_decode($out, true));
            break;

        default:
            respond(['error' => 'Método não suportado'], 405);
            break;
    }
} catch (Exception $e) {
    respond(['error' => 'Erro no servidor', 'message' => $e->getMessage()], 500);
}
