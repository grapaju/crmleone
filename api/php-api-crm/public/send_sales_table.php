<?php
// Ensure no stray PHP notices/warnings break JSON output
@ini_set('display_errors', '0');
@error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/config/Database.php';
require_once __DIR__ . '/../src/models/SalesTable.php';
require_once __DIR__ . '/../src/lib/send_sales_table_helper.php';

function respond($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function log_send($level, $message, $payload = null)
{
    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    $logFile = $logDir . '/send_sales_table.log';
    $entry = date('Y-m-d H:i:s') . " | " . strtoupper($level) . " | " . $message;
    if ($payload !== null) $entry .= ' | ' . (is_string($payload) ? $payload : json_encode($payload, JSON_UNESCAPED_UNICODE));
    file_put_contents($logFile, $entry . PHP_EOL, FILE_APPEND | LOCK_EX);
}

try {
    // clear output buffer to avoid any prior accidental output
    if (ob_get_level()) ob_end_clean();
    $raw = file_get_contents('php://input');
    // when running via CLI and piping JSON, php://input can be empty; try STDIN as fallback
    if (!is_string($raw) || trim($raw) === '') {
        // read from STDIN
        $stdin = '';
        if (defined('STDIN')) {
            while (!feof(STDIN)) {
                $stdin .= fgets(STDIN);
            }
        }
        if (trim($stdin) !== '') $raw = $stdin;
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) $body = [];

    $tableId = $body['tableId'] ?? null;
    $recipients = $body['recipients'] ?? [];
    $channel = $body['channel'] ?? 'email';
    // Delegate to helper which returns an array result
    // Clear output buffer to avoid accidental output
    if (ob_get_level()) ob_end_clean();
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        $stdin = '';
        if (defined('STDIN')) {
            while (!feof(STDIN)) $stdin .= fgets(STDIN);
        }
        if (trim($stdin) !== '') $raw = $stdin;
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) $body = [];
    $result = send_sales_table_payload_internal($body);
    if (isset($result['error'])) {
        respond($result, 400);
    }
    respond($result);
} catch (Throwable $e) {
    // Log unexpected errors and return a generic JSON error response
    log_send('error', 'Unhandled exception in send_sales_table.php', [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
    ]);
    respond(['error' => 'internal_server_error', 'message' => 'Internal server error'], 500);
}
