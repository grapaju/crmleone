<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Support CLI usage: pass a JSON string as first argument
    $body = null;
    if (php_sapi_name() === 'cli' && isset($argv[1])) {
        $body = json_decode($argv[1], true);
    } else {
        $body = json_decode(file_get_contents('php://input'), true);
    }
    if (!is_array($body)) $body = [];

    // DEBUG: log raw input and parsed body to help diagnose Windows/curl issues
    try {
        $raw = file_get_contents('php://input');
        $dbg = date('Y-m-d H:i:s') . " | DEBUG test_smtp raw: " . ($raw === false ? '<no-raw>' : $raw) . " | parsed body: " . json_encode($body, JSON_UNESCAPED_UNICODE) . PHP_EOL;
        file_put_contents(__DIR__ . '/../run_send_helper.log', $dbg, FILE_APPEND | LOCK_EX);
    } catch (Exception $e) {
        // ignore logging failures
    }

    $host = $body['host'] ?? '';
    $port = $body['port'] ?? 465;
    $user = $body['user'] ?? '';
    $pass = $body['password'] ?? '';
    $secure = $body['encryption'] ?? 'ssl';
    $to = $body['to'] ?? null;
    $from = $body['from'] ?? $user;
    $subject = $body['subject'] ?? 'Test email';
    $message = $body['message'] ?? 'This is a test message.';

    if (empty($host) || empty($user)) {
        respond(['ok' => false, 'message' => 'host e user são obrigatórios'], 400);
    }

    // Require PHPMailer via Composer
    $autoload = __DIR__ . '/../vendor/autoload.php';
    if (!file_exists($autoload)) {
        respond(['ok' => false, 'message' => 'PHPMailer não instalado. Rode composer require phpmailer/phpmailer dentro de api/php-api-crm'], 500);
    }
    require_once $autoload;

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = $host;
        // Enable SMTPAuth only when user is provided
        if (!empty($user)) {
            $mail->SMTPAuth = true;
            $mail->Username = $user;
            $mail->Password = $pass;
        } else {
            $mail->SMTPAuth = false;
        }
        $mail->SMTPSecure = $secure;
        $mail->Port = (int)$port;

        // Accept self-signed certs in local/dev environments
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ],
        ];

        // Try to establish SMTP connection
        $connected = $mail->smtpConnect();
        if (!$connected) {
            $err = $mail->ErrorInfo ?: 'Falha ao conectar ao servidor SMTP';
            respond(['ok' => false, 'message' => $err], 502);
        }

        // If a "to" address was provided, attempt to send a test email
        if (!empty($to)) {
            try {
                // Set From and To
                if (filter_var($from, FILTER_VALIDATE_EMAIL)) {
                    $mail->setFrom($from);
                }
                $mail->addAddress($to);
                $mail->isHTML(false);
                $mail->Subject = $subject;
                $mail->Body = $message;

                $mail->send();
                $mail->smtpClose();
                respond(['ok' => true, 'message' => 'Teste: email enviado com sucesso', 'to' => $to]);
            } catch (Exception $e) {
                $mail->smtpClose();
                respond(['ok' => false, 'message' => 'Falha ao enviar email: ' . $e->getMessage(), 'debug' => $mail->ErrorInfo], 502);
            }
        }

        // Close connection and report success
        $mail->smtpClose();
        respond(['ok' => true, 'message' => 'Conexão SMTP bem-sucedida']);
    } catch (Exception $e) {
        respond(['ok' => false, 'message' => $e->getMessage()], 500);
    }
} catch (Exception $e) {
    respond(['ok' => false, 'message' => $e->getMessage()], 500);
}
