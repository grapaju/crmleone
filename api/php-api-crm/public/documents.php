<?php
header("Access-Control-Allow-Origin: http://localhost:5173"); // ajuste para o domínio do frontend
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// --- Middleware de autenticação ---

session_start();
// --- LOG DE SESSÃO PARA DEBUG ---
$debugLogDir = __DIR__ . '/../logs';
$debugLogPath = $debugLogDir . '/session_debug.log';
if (!file_exists($debugLogDir)) {
    @mkdir($debugLogDir, 0755, true);
}
$debugEntry = [
    'time' => date('c'),
    'session_id' => session_id(),
    'session_name' => session_name(),
    'cookies' => $_COOKIE,
    'session' => $_SESSION,
    'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? null,
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
];
@file_put_contents($debugLogPath, json_encode($debugEntry, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND);
// --- FIM LOG DE SESSÃO ---
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Acesso não autorizado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Request logging for debugging --------------------------------------
$logDir = __DIR__ . '/../logs';
$logPath = $logDir . '/documents_requests.log';
if (!file_exists($logDir)) {
    @mkdir($logDir, 0755, true);
}

$rawBody = file_get_contents('php://input');
$headers = function_exists('getallheaders') ? getallheaders() : [];
$filesMeta = [];
foreach ($_FILES as $k => $f) {
    if (is_array($f['name'])) {
        // multiple files input
        $filesMeta[$k] = [];
        foreach ($f['name'] as $i => $name) {
            $filesMeta[$k][] = [
                'name' => $name,
                'type' => $f['type'][$i] ?? null,
                'size' => $f['size'][$i] ?? null,
            ];
        }
    } else {
        $filesMeta[$k] = [
            'name' => $f['name'],
            'type' => $f['type'],
            'size' => $f['size'],
        ];
    }
}

$logEntry = [
    'time' => date('c'),
    'method' => $_SERVER['REQUEST_METHOD'] ?? null,
    'uri' => $_SERVER['REQUEST_URI'] ?? null,
    'headers' => $headers,
    'get' => $_GET,
    'post' => $_POST,
    'raw_body' => $rawBody,
    'files' => $filesMeta,
];

@file_put_contents($logPath, json_encode($logEntry, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND);
// -------------------------------------------------------------------------

require_once '../src/config/database.php';
require_once '../src/controllers/DocumentController.php';

$db = getDatabaseConnection();
$controller = new DocumentController($db);

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['id'])) {
            $result = $controller->read($_GET['id']);
            echo json_encode($result ? $result : []);
        } else if (isset($_GET['propertyId'])) {
            $all = $controller->readAll();
            $filtered = array_filter($all, function ($d) {
                if (!isset($_GET['propertyId'])) return true;
                $pid = $_GET['propertyId'];
                return isset($d['propertyId']) && strval($d['propertyId']) === strval($pid);
            });
            echo json_encode(array_values($filtered));
        } else {
            echo json_encode($controller->readAll());
        }
        break;

    case 'POST':
        // Support JSON body or multipart/form-data with file upload
        $payload = [];
        if (!empty($_FILES) && isset($_FILES['file'])) {
            // collect fields from $_POST
            $payload = $_POST;

            // handle single file upload
            // Validação de arquivo
            $allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            $maxSize = 10 * 1024 * 1024; // 10MB

            $propertyId = isset($_POST['propertyId']) ? intval($_POST['propertyId']) : 0;
            $uploadDir = __DIR__ . '/uploads/' . $propertyId;
            if (!file_exists($uploadDir)) @mkdir($uploadDir, 0755, true);

            $f = $_FILES['file'];
            if ($f['error'] === UPLOAD_ERR_OK) {
                $fileType = mime_content_type($f['tmp_name']);
                $fileSize = $f['size'];
                if (!in_array($fileType, $allowedTypes) || $fileSize > $maxSize) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Arquivo inválido']);
                    exit;
                }
                if (strpos($fileType, 'image/') === 0 && !getimagesize($f['tmp_name'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Imagem inválida']);
                    exit;
                }
                $ext = pathinfo($f['name'], PATHINFO_EXTENSION);
                $safe = time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
                $dest = $uploadDir . '/' . $safe;
                if (move_uploaded_file($f['tmp_name'], $dest)) {
                    // save relative path
                    $payload['file_path'] = $propertyId . '/' . $safe;
                    $payload['type'] = strtoupper($ext);
                }
            }
        } elseif (!empty($_POST)) {
            // fields sent as multipart/form-data without a file
            $payload = $_POST;
        } else {
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
        }

        // Normalize fields: front may send name/propertyId
        $data = [];
        $data['title'] = $payload['name'] ?? $payload['title'] ?? '';
        $data['description'] = $payload['description'] ?? null;
        $data['category'] = $payload['category'] ?? ($payload['type'] ?? 'Outros');
        $data['type'] = $payload['type'] ?? '';
        $data['file_path'] = $payload['file_path'] ?? ($payload['file_path'] ?? '');
        $data['property_id'] = $payload['propertyId'] ?? $payload['property_id'] ?? null;
        $data['expiryDate'] = $payload['expiryDate'] ?? null;
        $data['uploaded_by'] = $payload['uploaded_by'] ?? $payload['uploadedBy'] ?? null;

        // If client used method override to simulate PUT (FormData update via POST)
        if (isset($payload['_method']) && strtoupper($payload['_method']) === 'PUT') {
            $id = $_GET['id'] ?? ($payload['id'] ?? null);
            if ($id) {
                $updateData = [];
                if (isset($payload['name'])) $updateData['title'] = $payload['name'];
                if (isset($payload['description'])) $updateData['description'] = $payload['description'];
                if (isset($payload['category'])) $updateData['category'] = $payload['category'];
                if (isset($payload['type'])) $updateData['type'] = $payload['type'];
                if (isset($payload['status'])) $updateData['status'] = $payload['status'];
                if (isset($payload['file_path'])) $updateData['file_path'] = $payload['file_path'];
                if (isset($payload['propertyId'])) $updateData['property_id'] = $payload['propertyId'];
                if (isset($payload['expiryDate'])) $updateData['expiryDate'] = $payload['expiryDate'];
                if (isset($payload['uploaded_by'])) $updateData['uploaded_by'] = $payload['uploaded_by'];

                // If a new file was uploaded, remove the old file from disk (safety: only under uploads/)
                if (isset($updateData['file_path'])) {
                    $existing = $controller->read($id);
                    if ($existing && !empty($existing['file_path']) && $existing['file_path'] !== $updateData['file_path']) {
                        $uploadsDir = __DIR__ . '/uploads/';
                        $oldPath = realpath(__DIR__ . '/' . $existing['file_path']);
                        if ($oldPath && strpos($oldPath, realpath($uploadsDir)) === 0 && is_file($oldPath)) {
                            @unlink($oldPath);
                        }
                    }
                }

                if ($controller->update($id, $updateData)) {
                    echo json_encode(['message' => 'Documento atualizado com sucesso']);
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Erro ao atualizar documento']);
                }
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'ID não informado para atualização']);
            }
        } else {
            $result = $controller->create($data);
            if ($result) {
                echo json_encode(['id' => $result]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Erro ao criar documento']);
            }
        }
        break;

    case 'PUT':
        // Support multipart PUT (some clients simulate PUT via POST with _method=PUT) or JSON body
        // Prefer id from query string
        $id = $_GET['id'] ?? null;

        $payload = [];
        // If multipart upload arrives via PUT or via POST with _method=PUT
        if (!empty($_FILES) && isset($_FILES['file'])) {
            $payload = $_POST;

            // Validação de arquivo
            $allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            $maxSize = 10 * 1024 * 1024; // 10MB

            $propertyId = isset($payload['propertyId']) ? intval($payload['propertyId']) : 0;
            $uploadDir = __DIR__ . '/uploads/' . $propertyId;
            if (!file_exists($uploadDir)) @mkdir($uploadDir, 0755, true);

            $f = $_FILES['file'];
            if ($f['error'] === UPLOAD_ERR_OK) {
                $fileType = mime_content_type($f['tmp_name']);
                $fileSize = $f['size'];
                if (!in_array($fileType, $allowedTypes) || $fileSize > $maxSize) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Arquivo inválido']);
                    exit;
                }
                if (strpos($fileType, 'image/') === 0 && !getimagesize($f['tmp_name'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Imagem inválida']);
                    exit;
                }
                $ext = pathinfo($f['name'], PATHINFO_EXTENSION);
                $safe = time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
                $dest = $uploadDir . '/' . $safe;
                if (move_uploaded_file($f['tmp_name'], $dest)) {
                    $payload['file_path'] = $propertyId . '/' . $safe;
                    $payload['type'] = strtoupper($ext);
                }
            }
        } elseif (!empty($_POST)) {
            // fields sent as multipart/form-data without a file
            $payload = $_POST;
        } else {
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
        }

        $id = $id ?? ($payload['id'] ?? null);

        if ($id) {
            $data = [];
            if (isset($payload['name'])) $data['title'] = $payload['name'];
            if (isset($payload['description'])) $data['description'] = $payload['description'];
            if (isset($payload['category'])) $data['category'] = $payload['category'];
            if (isset($payload['type'])) $data['type'] = $payload['type'];
            if (isset($payload['status'])) $data['status'] = $payload['status'];
            if (isset($payload['file_path'])) $data['file_path'] = $payload['file_path'];
            if (isset($payload['propertyId'])) $data['property_id'] = $payload['propertyId'];
            if (isset($payload['expiryDate'])) $data['expiryDate'] = $payload['expiryDate'];
            if (isset($payload['uploaded_by'])) $data['uploaded_by'] = $payload['uploaded_by'];

            // Remove old file if replaced
            if (isset($data['file_path'])) {
                $existing = $controller->read($id);
                if ($existing && !empty($existing['file_path']) && $existing['file_path'] !== $data['file_path']) {
                    $uploadsDir = __DIR__ . '/uploads/';
                    $oldPath = realpath(__DIR__ . '/' . $existing['file_path']);
                    if ($oldPath && strpos($oldPath, realpath($uploadsDir)) === 0 && is_file($oldPath)) {
                        @unlink($oldPath);
                    }
                }
            }

            if ($controller->update($id, $data)) {
                echo json_encode(['message' => 'Documento atualizado com sucesso']);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Erro ao atualizar documento']);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'ID não informado para atualização']);
        }
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if ($id && $controller->delete($id)) {
            echo json_encode(['message' => 'Documento removido com sucesso']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Erro ao remover documento']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
