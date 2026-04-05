<?php
// Script to run automations due at current date/time.
// Usage: php run_automations.php (or schedule via cron/Task Scheduler)

@ini_set('display_errors', '0');
@error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../src/config/database.php';
require_once __DIR__ . '/../src/models/SalesTable.php';
require_once __DIR__ . '/../src/lib/send_sales_table_helper.php';

function respond($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Ensure script uses the local timezone. Change as needed.
// You can override by exporting PHP_TZ env var or editing php.ini date.timezone.
$tz = getenv('PHP_TZ') ?: 'America/Sao_Paulo';
date_default_timezone_set($tz);

// logging helper for run_automations
function run_log($level, $message, $payload = null) {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    $logFile = $logDir . '/run_automations.log';
    $entry = date('Y-m-d H:i:s') . " | " . strtoupper($level) . " | " . $message;
    if ($payload !== null) $entry .= ' | ' . (is_string($payload) ? $payload : json_encode($payload, JSON_UNESCAPED_UNICODE));
    file_put_contents($logFile, $entry . PHP_EOL, FILE_APPEND | LOCK_EX);
}

// startup log
run_log('info', 'run_automations started', ['tz' => $tz, 'window_minutes' => $windowMinutes ?? 'unset']);

try {
    $db = getDatabaseConnection();
    $now = new DateTime('now');
    $day = (int)$now->format('j'); // day of month without leading zero
    $time = $now->format('H:i'); // current hour:minute
    // window is configurable via env RUN_AUTOMATIONS_WINDOW (minutes)
    $windowMinutes = intval(getenv('RUN_AUTOMATIONS_WINDOW') ?: 5);

    // find active automations for this day and time (exact match on hora_envio)
    $stmt = $db->prepare("SELECT id, table_id, dia_mes AS dayOfMonth, hora_envio, recipients, status FROM automations WHERE status = 'Ativa' AND (dia_mes = :day OR dia_mes = 0)");
    $stmt->execute([':day' => $day]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $triggered = [];
    foreach ($rows as $r) {
        $hora = isset($r['hora_envio']) ? trim($r['hora_envio']) : null;
        if (!$hora) continue; // no scheduled time
    // normalize scheduled time to H:i (hora_envio may be stored as H:i:s)
        $horaShort = null;
        try {
            $d = DateTime::createFromFormat('H:i:s', $hora);
            if ($d) $horaShort = $d->format('H:i');
            else {
                $d2 = DateTime::createFromFormat('H:i', $hora);
                if ($d2) $horaShort = $d2->format('H:i');
                else $horaShort = substr($hora, 0, 5);
            }
        } catch (Exception $ex) {
            $horaShort = substr($hora, 0, 5);
        }
        // allow match within a window of minutes to tolerate scheduling inexactness
        $scheduled = DateTime::createFromFormat('H:i', $horaShort);
        if (!$scheduled) continue;
        // create DateTime for today at scheduled time
        $scheduledToday = DateTime::createFromFormat('Y-m-d H:i', $now->format('Y-m-d') . ' ' . $scheduled->format('H:i'));
        if (!$scheduledToday) continue;
        $diffMinutes = (int)abs(($now->getTimestamp() - $scheduledToday->getTimestamp()) / 60);
        if ($diffMinutes > $windowMinutes) continue;

    // check history to avoid duplicate send for same table today (type = 'automation')
        try {
            $hstmt = $db->prepare("SELECT COUNT(*) AS c FROM history WHERE table_id = :table_id AND DATE(date) = DATE(:today) AND \"type\" = 'automation'");
            $hstmt->execute([':table_id' => $r['table_id'], ':today' => $now->format('Y-m-d H:i:s')]);
            $hc = $hstmt->fetch(PDO::FETCH_ASSOC);
            if ($hc && isset($hc['c']) && (int)$hc['c'] > 0) {
                // already triggered today for this table
        run_log('info', 'skip already triggered today', ['automation' => $r['id'], 'table_id' => $r['table_id']]);
        continue;
            }
        } catch (Exception $e) {
            // ignore history check errors and proceed
        }

        // build recipients list
        $recipients = [];
        $decoded = json_decode($r['recipients'], true);
        if (is_array($decoded)) {
            $recipients = $decoded;
        } else {
            $names = array_map('trim', explode(',', $r['recipients'] ?? ''));
            foreach ($names as $n) {
                if ($n === '') continue;
                $recipients[] = ['name' => $n, 'email' => ''];
            }
        }

        // prepare payload for send_sales_table.php
        $payload = [
            'tableId' => $r['table_id'],
            'recipients' => $recipients,
            'channel' => 'email',
            '__inferred_type' => 'automation',
        ];

        // invoke local send logic by including the file and emulating php://input
        // Temporarily replace php://input stream by creating a stream wrapper is complex; instead call via HTTP to localhost if possible
        // build send URL; when running via CLI $_SERVER vars may be absent, use localhost/v4 fallback
        if (isset($_SERVER['HTTP_HOST'])) {
            $baseUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
            $sendUrl = rtrim($baseUrl, '/') . dirname($_SERVER['SCRIPT_NAME']) . '/send_sales_table.php';
        } else {
            // fallback for CLI execution - adjust if your app is mounted under a different path
            $sendUrl = 'http://localhost/v4/api/php-api-crm/public/send_sales_table.php';
        }

        // Call internal helper directly for robust execution
        try {
            run_log('info', 'triggering automation', ['automation' => $r['id'], 'table_id' => $r['table_id'], 'hora_envio' => $r['hora_envio']]);
            $callPayload = [
                'tableId' => $r['table_id'],
                'recipients' => is_string($r['recipients']) ? json_decode($r['recipients'], true) ?? [] : $r['recipients'],
                'channel' => 'email',
                '__inferred_type' => 'automation',
            ];
            $resp = send_sales_table_payload_internal($callPayload);
            if (isset($resp['error'])) {
                run_log('error', 'automation send failed', ['automation' => $r['id'], 'response' => $resp]);
                $triggered[] = ['automation_id' => $r['id'], 'status' => 'failed', 'response' => $resp];
            } else {
                run_log('info', 'automation send ok', ['automation' => $r['id'], 'response' => $resp]);
                $triggered[] = ['automation_id' => $r['id'], 'status' => 'ok', 'response' => $resp];
            }
        } catch (Exception $e) {
            run_log('error', 'exception when triggering', ['automation' => $r['id'], 'message' => $e->getMessage()]);
            $triggered[] = ['automation_id' => $r['id'], 'status' => 'failed', 'response' => ['error' => $e->getMessage()]];
        }
    }

    respond(['runAt' => $now->format('Y-m-d H:i:s'), 'checked' => count($rows), 'triggered' => $triggered]);
} catch (Exception $e) {
    respond(['error' => true, 'message' => $e->getMessage()]);
}
