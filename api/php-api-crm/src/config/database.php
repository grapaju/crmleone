<?php
function getDatabaseConnection()
{
    $databaseUrl = getenv('DATABASE_URL') ?: '';

    if ($databaseUrl !== '') {
        $parts = parse_url($databaseUrl);
        if ($parts === false) {
            http_response_code(500);
            echo json_encode(['error' => 'DATABASE_URL inválida.']);
            exit;
        }

        $host = $parts['host'] ?? 'localhost';
        $port = isset($parts['port']) ? (string) $parts['port'] : '5432';
        $db_name = isset($parts['path']) ? ltrim($parts['path'], '/') : 'crm_imoveis';
        $username = isset($parts['user']) ? urldecode($parts['user']) : 'postgres';
        $password = isset($parts['pass']) ? urldecode($parts['pass']) : '';
    } else {
        $host = getenv('DB_HOST') ?: 'localhost';
        $port = getenv('DB_PORT') ?: '5432';
        $db_name = getenv('DB_NAME') ?: 'crm_imoveis';
        $username = getenv('DB_USER') ?: 'postgres';
        $password = getenv('DB_PASSWORD') ?: '';
    }

    $conn = "pgsql:host=$host;port=$port;dbname=$db_name";
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
