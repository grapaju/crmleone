<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/config/Database.php';

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = getDatabaseConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Try old 'configuracoes' table first
        try {
            $stmt = $db->prepare("SELECT chave, valor FROM configuracoes");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $out = [];
            foreach ($rows as $r) {
                $out[$r['chave']] = $r['valor'];
            }
            respond($out);
        } catch (PDOException $pe) {
            // If table not found, fallback to 'settings' table with key_name/value
            if ($pe->getCode() === '42S02') {
                $stmt = $db->prepare("SELECT key_name, value FROM settings");
                $stmt->execute();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $out = [];
                foreach ($rows as $r) {
                    $out[$r['key_name']] = $r['value'];
                }
                respond($out);
            }
            throw $pe;
        }
    }

    if ($method === 'PUT' || $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) respond(['error' => 'Payload inválido'], 400);

        // Upsert each key, try configuracoes first then fallback to settings
        foreach ($data as $key => $value) {
            try {
                $stmt = $db->prepare("INSERT INTO configuracoes (chave, valor) VALUES (:chave, :valor)
                    ON DUPLICATE KEY UPDATE valor = :valor2");
                $stmt->execute([':chave' => $key, ':valor' => $value, ':valor2' => $value]);
            } catch (PDOException $pe) {
                if ($pe->getCode() === '42S02') {
                    // fallback to settings table (key_name/value)
                    $stmt = $db->prepare("INSERT INTO settings (key_name, value) VALUES (:k, :v)
                        ON DUPLICATE KEY UPDATE value = :v2");
                    $stmt->execute([':k' => $key, ':v' => $value, ':v2' => $value]);
                } else {
                    throw $pe;
                }
            }
        }

        respond(['success' => true]);
    }

    respond(['error' => 'Método não suportado'], 405);
} catch (Exception $e) {
    respond(['error' => 'Erro no servidor', 'message' => $e->getMessage()], 500);
}
