<?php
function getDatabaseConnection()
{

    $host = 'localhost';
    $db_name = 'crm_imoveis';
    $username = 'root';
    $password = '';
    $charset = 'utf8mb4';

    $conn = "mysql:host=$host;dbname=$db_name;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    try {
        return new PDO($conn, $username, $password, $options);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao conectar no banco: ' . $e->getMessage()]);
        exit;
    }
}
