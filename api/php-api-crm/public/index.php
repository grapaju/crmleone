<?php
require_once '../src/config/database.php';
require_once '../src/routes/api.php';

header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Initialize the API
switch ($method) {
    case 'GET':
    case 'POST':
    case 'PUT':
    case 'DELETE':
        // Call the API routing function
        api($method, $requestUri);
        break;
    default:
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
        break;
}
?>