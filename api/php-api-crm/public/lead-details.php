<?php
// Libera CORS para requisições do frontend
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
// Exemplo de rotas para expor detalhes do lead e ativação/desativação de dicas
require_once __DIR__ . '/../src/controllers/LeadDetailsController.php';
require_once __DIR__ . '/../src/controllers/TipController.php';


// Rota: GET /api/lead-details/{id} (REST) ou /lead-details.php?id=4 (query string)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $leadId = null;
    // Tenta pegar pelo REST
    if (preg_match('#^/api/lead-details/(\d+)$#', $_SERVER['REQUEST_URI'], $matches)) {
        $leadId = (int)$matches[1];
    }
    // Ou pela query string
    if (!$leadId && isset($_GET['id'])) {
        $leadId = (int)$_GET['id'];
    }
    if ($leadId) {
        require_once __DIR__ . '/../src/config/database.php';
        $db = getDatabaseConnection();
        $controller = new LeadDetailsController($db);
        $result = $controller->getDetails($leadId);
        header('Content-Type: application/json');
        echo json_encode($result);
        exit;
    }
}

// (Movido para lead-tip-toggle.php)
