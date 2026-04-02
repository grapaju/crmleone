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
CREATE TABLE IF NOT EXISTS `agenda` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `titulo` VARCHAR(255) NOT NULL,
  `tipo` ENUM('Visita', 'Reunião', 'Ligação', 'Outro') NOT NULL,
  `data_inicio` DATETIME NOT NULL,
  `data_fim` DATETIME NOT NULL,
  `lead_id` INT NULL,
  `imovel_id` INT NULL,
  `unidade_id` INT NULL,
  `usuario_id` INT NOT NULL,
  `status` ENUM('Confirmado', 'Pendente', 'Cancelado', 'Realizado') NOT NULL,
  `observacoes` TEXT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL;

try {
    $pdo->exec($sql);
    echo json_encode(["ok" => true, "message" => "Tabela agenda criada ou já existia."]);
} catch (PDOException $e) {
    http_response_code(500);
    error_log("setup_create_agenda error: " . $e->getMessage());
    echo json_encode(["error" => "DB_ERROR", "message" => $e->getMessage()]);
}
