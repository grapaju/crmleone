<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/config/database.php';

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function table_exists($db, $tableName) {
    $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = :table");
    $stmt->execute([':table' => $tableName]);
    return ((int)$stmt->fetchColumn()) > 0;
}

function upsert_key_value($db, $table, $keyCol, $valueCol, $key, $value) {
    $update = $db->prepare("UPDATE {$table} SET {$valueCol} = :v WHERE {$keyCol} = :k");
    $update->execute([':k' => $key, ':v' => $value]);

    if ($update->rowCount() === 0) {
        $insert = $db->prepare("INSERT INTO {$table} ({$keyCol}, {$valueCol}) VALUES (:k, :v)");
        $insert->execute([':k' => $key, ':v' => $value]);
    }
}

try {
    $db = getDatabaseConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Try old 'configuracoes' table first
        if (table_exists($db, 'configuracoes')) {
            $stmt = $db->prepare("SELECT chave, valor FROM configuracoes");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $out = [];
            foreach ($rows as $r) {
                $out[$r['chave']] = $r['valor'];
            }
            respond($out);
        }

        if (table_exists($db, 'settings')) {
            $stmt = $db->prepare("SELECT key_name, value FROM settings");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $out = [];
            foreach ($rows as $r) {
                $out[$r['key_name']] = $r['value'];
            }
            respond($out);
        }

        respond([]);
    }

    if ($method === 'PUT' || $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) respond(['error' => 'Payload inválido'], 400);

        $hasConfiguracoes = table_exists($db, 'configuracoes');
        $hasSettings = table_exists($db, 'settings');

        if (!$hasConfiguracoes && !$hasSettings) {
            respond(['error' => 'Nenhuma tabela de configurações encontrada (configuracoes/settings).'], 500);
        }

        foreach ($data as $key => $value) {
            if ($hasConfiguracoes) {
                upsert_key_value($db, 'configuracoes', 'chave', 'valor', $key, $value);
            } else {
                upsert_key_value($db, 'settings', 'key_name', 'value', $key, $value);
            }
        }

        respond(['success' => true]);
    }

    respond(['error' => 'Método não suportado'], 405);
} catch (Exception $e) {
    respond(['error' => 'Erro no servidor', 'message' => $e->getMessage()], 500);
}
