<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With");

// respond to preflight immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}


require_once __DIR__ . '/../src/config/database.php';
require_once __DIR__ . '/../src/controllers/PropertyImageController.php';

// simple request logging to help debug empty responses
$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
@file_put_contents($logDir . '/property_images.log', date('c') . " - hit\n", FILE_APPEND);

// (debug removed) continuar para estabelecer conexão com o banco e processar a requisição

// establish DB connection
try {
    $pdo = getDatabaseConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection error", "details" => $e->getMessage()]);
    @file_put_contents($logDir . '/property_images.log', date('c') . " - db error: " . $e->getMessage() . "\n", FILE_APPEND);
    exit;
}

// trace log: conexão estabelecida
@file_put_contents($logDir . '/property_images.log', date('c') . " - db ok\n", FILE_APPEND);
@file_put_contents($logDir . '/property_images.log', date('c') . " - method: " . ($_SERVER['REQUEST_METHOD'] ?? 'UNK') . "\n", FILE_APPEND);

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents("php://input"), true);
$controller = new PropertyImageController($pdo);

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            echo json_encode($controller->show($_GET['id']));
        } elseif (isset($_GET['property_id'])) {
            echo json_encode($controller->byProperty($_GET['property_id']));
        } elseif (isset($_GET['project_id'])) {
            echo json_encode($controller->byProject($_GET['project_id']));
        } elseif (isset($_GET['unit_id'])) {
            echo json_encode($controller->byUnit($_GET['unit_id']));
        } else {
            echo json_encode($controller->index());
        }
        break;

    case 'POST':
        // Suporta upload multipart/form-data (campo 'file') ou JSON no body para compatibilidade
        if (!empty($_FILES) && isset($_FILES['file'])) {
            // Log detalhado dos campos recebidos para depuração (POST/GET/REQUEST)
            @file_put_contents($logDir . '/property_images.log', date('c') . " - POST data: " . json_encode($_POST) . "\n", FILE_APPEND);
            @file_put_contents($logDir . '/property_images.log', date('c') . " - GET data: " . json_encode($_GET) . "\n", FILE_APPEND);
            @file_put_contents($logDir . '/property_images.log', date('c') . " - REQUEST data: " . json_encode($_REQUEST) . "\n", FILE_APPEND);

            // obtem id alvo via POST ou query (pode ser property_id, project_id ou unit_id)
            $propertyId = $_POST['property_id'] ?? $_GET['property_id'] ?? null;
            $projectId = $_POST['project_id'] ?? $_GET['project_id'] ?? null;
            $unitId = $_POST['unit_id'] ?? $_GET['unit_id'] ?? null;
            if (!$propertyId && !$projectId && !$unitId) {
                http_response_code(400);
                // incluir debug dos campos recebidos
                $received = [
                    'POST' => $_POST,
                    'GET' => $_GET,
                    'FILES' => isset($_FILES['file']) ? ['name' => $_FILES['file']['name'], 'size' => $_FILES['file']['size'] ?? 0] : null
                ];
                echo json_encode(["error" => "property_id não informado", 'received' => $received]);
                exit;
            }

            // armazenar uploads dentro de public/uploads para que sejam servíveis pelo Apache
            $uploadDir = __DIR__ . '/uploads/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

            // detalhes de debug do arquivo enviado
            @file_put_contents($logDir . '/property_images.log', date('c') . " - upload incoming: " . json_encode($_FILES['file']) . "\n", FILE_APPEND);

            $tmpName = $_FILES['file']['tmp_name'];
            $origName = basename($_FILES['file']['name']);
            $fileSize = $_FILES['file']['size'] ?? 0;
            $fileError = $_FILES['file']['error'] ?? 0;
            $fileType = mime_content_type($tmpName) ?: ($_FILES['file']['type'] ?? 'application/octet-stream');
            @file_put_contents($logDir . '/property_images.log', date('c') . " - file tmpName=$tmpName origName=$origName size=$fileSize error=$fileError type=$fileType\n", FILE_APPEND);

            // Validações: tamanho máximo (ex: 5MB) e MIME allowlist (jpeg/png/webp)
            $maxSize = 5 * 1024 * 1024; // 5 MB
            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

            if ($fileSize > $maxSize) {
                http_response_code(413);
                echo json_encode(["error" => "Arquivo muito grande. Máx: 5MB"]);
                exit;
            }

            if (!in_array($fileType, $allowedMimes)) {
                http_response_code(415);
                echo json_encode(["error" => "Tipo de arquivo não permitido: $fileType"]);
                exit;
            }
            $ext = pathinfo($origName, PATHINFO_EXTENSION);
            $safeName = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', pathinfo($origName, PATHINFO_FILENAME));
            $finalName = $safeName . '_' . time() . ($ext ? '.' . $ext : '');
            $targetPath = $uploadDir . $finalName;

            $moved = false;
            try {
                $moved = move_uploaded_file($tmpName, $targetPath);
            } catch (Exception $e) {
                @file_put_contents($logDir . '/property_images.log', date('c') . " - move exception: " . $e->getMessage() . "\n", FILE_APPEND);
            }
            @file_put_contents($logDir . '/property_images.log', date('c') . " - move_uploaded_file result: " . ($moved ? 'success' : 'failure') . " target=$targetPath\n", FILE_APPEND);
            if (!$moved) {
                http_response_code(500);
                echo json_encode(["error" => "Falha ao mover arquivo enviado"]);
                exit;
            }

            // marker to ensure execution continues after successful move
            @file_put_contents($logDir . '/property_images.log', date('c') . " - post-move continue\n", FILE_APPEND);

            // Salva registro no banco com image_url relativo (public path)
            $publicPath = 'uploads/' . $finalName;
            $data = [
                'property_id' => $propertyId,
                'project_id' => $projectId ?? ($_POST['project_id'] ?? null),
                'unit_id' => $unitId ?? ($_POST['unit_id'] ?? null),
                'image_url' => $publicPath,
                'is_primary' => $_POST['is_primary'] ?? null,
            ];

            // log payload que será salvo
            @file_put_contents($logDir . '/property_images.log', date('c') . " - saving data: " . json_encode($data) . "\n", FILE_APPEND);
            try {
                @file_put_contents($logDir . '/property_images.log', date('c') . " - about to call controller->store with: " . json_encode($data) . "\n", FILE_APPEND);
                $id = $controller->store($data);
                @file_put_contents($logDir . '/property_images.log', date('c') . " - saved id: " . json_encode($id) . "\n", FILE_APPEND);
                echo json_encode(["message" => "Imagem cadastrada com sucesso", "id" => $id, "image_url" => $publicPath]);
            } catch (Exception $e) {
                @file_put_contents($logDir . '/property_images.log', date('c') . " - save error: " . $e->getMessage() . " data: " . json_encode($data) . "\n", FILE_APPEND);
                http_response_code(500);
                echo json_encode(["error" => "Erro ao salvar imagem no banco", "details" => $e->getMessage(), 'data' => $data]);
            }
        } else {
            // compatibilidade: body JSON
            @file_put_contents($logDir . '/property_images.log', date('c') . " - saving json body: " . json_encode($input) . "\n", FILE_APPEND);
            try {
                @file_put_contents($logDir . '/property_images.log', date('c') . " - about to call controller->store (json body) with: " . json_encode($input) . "\n", FILE_APPEND);
                $id = $controller->store($input);
                @file_put_contents($logDir . '/property_images.log', date('c') . " - saved id json: " . json_encode($id) . "\n", FILE_APPEND);
                echo json_encode(["message" => "Imagem cadastrada com sucesso", "id" => $id]);
            } catch (Exception $e) {
                @file_put_contents($logDir . '/property_images.log', date('c') . " - save json error: " . $e->getMessage() . " data: " . json_encode($input) . "\n", FILE_APPEND);
                http_response_code(500);
                echo json_encode(["error" => "Erro ao salvar imagem no banco", "details" => $e->getMessage(), 'data' => $input]);
            }
        }
        break;

    case 'PUT':
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "ID não informado"]);
            exit;
        }
        $controller->update($_GET['id'], $input);
        echo json_encode(["message" => "Imagem atualizada com sucesso"]);
        break;

    case 'DELETE':
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "ID não informado"]);
            exit;
        }
        // antes de excluir do banco, buscar registro para remover arquivo físico
        $img = $controller->show($_GET['id']);
        if ($img && !empty($img['image_url'])) {
            $filePath = __DIR__ . '/../' . $img['image_url'];
            if (file_exists($filePath) && is_file($filePath)) {
                @unlink($filePath);
            }
        }
        $controller->destroy($_GET['id']);
        echo json_encode(["message" => "Imagem excluída com sucesso"]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Método não permitido"]);
        break;
}
