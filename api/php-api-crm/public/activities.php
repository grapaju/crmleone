<?php
$applyCors = require __DIR__ . '/../src/helpers/cors.php';

$applyCors(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], true);
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Retorno vazio para testes
echo json_encode([]);