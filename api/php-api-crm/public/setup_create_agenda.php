<?php
// Temporary setup script - create agenda table if missing
// Run once via browser: http://localhost/v4/api/php-api-crm/public/setup_create_agenda.php
// Remove this file after use for security.

require_once __DIR__ . '/../src/config/database.php';

try {
    $pdo = getDatabaseConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "DB_CONN", "message" => $e->getMessage()]);
    exit;
}

$sql = <<<SQL
CREATE TABLE IF NOT EXISTS agenda (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Visita', 'Reunião', 'Ligação', 'Outro')),
    data_inicio TIMESTAMP NOT NULL,
    data_fim TIMESTAMP NOT NULL,
    lead_id BIGINT NULL,
    imovel_id BIGINT NULL,
    unidade_id BIGINT NULL,
    usuario_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Confirmado', 'Pendente', 'Cancelado', 'Realizado')),
    observacoes TEXT NULL
);
SQL;

try {
    $pdo->exec($sql);
    echo json_encode(["ok" => true, "message" => "Tabela agenda criada ou já existia."]);
} catch (PDOException $e) {
    http_response_code(500);
    error_log("setup_create_agenda error: " . $e->getMessage());
    echo json_encode(["error" => "DB_ERROR", "message" => $e->getMessage()]);
}
