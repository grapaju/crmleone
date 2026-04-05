<?php
// Helper with reusable send logic for sales tables
@ini_set('display_errors', '0');
@error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/SalesTable.php';

function helper_log_send($level, $message, $payload = null)
{
    $logDir = __DIR__ . '/../../public/../logs';
    $logDir = realpath(__DIR__ . '/../../public/../logs') ?: (__DIR__ . '/../../public/logs');
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    $logFile = dirname($logDir) . '/run_send_helper.log';
    $entry = date('Y-m-d H:i:s') . " | " . strtoupper($level) . " | " . $message;
    if ($payload !== null) $entry .= ' | ' . (is_string($payload) ? $payload : json_encode($payload, JSON_UNESCAPED_UNICODE));
    file_put_contents($logFile, $entry . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function send_sales_table_payload_internal($body)
{
    try {
        $db = getDatabaseConnection();
        $model = new SalesTable($db);

        $tableId = $body['tableId'] ?? null;
        $recipients = $body['recipients'] ?? [];
        $channel = $body['channel'] ?? 'email';

        if (!$tableId) return ['error' => 'tableId é obrigatório'];
        if (!is_array($recipients) || count($recipients) === 0) return ['error' => 'recipients é obrigatório'];
        if ($channel !== 'email') return ['error' => 'Canal não suportado: ' . $channel];

        $table = $model->getById($tableId);
        if (!$table) return ['error' => 'Tabela não encontrada'];

        // Build base URL for attachments
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '/');
        $base = rtrim($scheme . '://' . $host . $scriptDir, '/');

        $attachments = is_array($table['attachments'] ?? []) ? $table['attachments'] : [];

        $sent = 0;
        $failed = [];
        $statuses = [];

        // Try to use PHPMailer via Composer if available
        $usePHPMailer = false;
        if (file_exists(__DIR__ . '/../../vendor/autoload.php')) {
            require_once __DIR__ . '/../../vendor/autoload.php';
            if (class_exists('\PHPMailer\PHPMailer\PHPMailer')) $usePHPMailer = true;
        }

        // SMTP config from env or DB defaults
        $smtpHost = getenv('SMTP_HOST') ?: getenv('MAIL_HOST');
        $smtpPort = getenv('SMTP_PORT') ?: 587;
        $smtpUser = getenv('SMTP_USER') ?: getenv('MAIL_USER');
        $smtpPass = getenv('SMTP_PASS') ?: getenv('MAIL_PASS');
        $smtpSecure = getenv('SMTP_SECURE') ?: 'tls';
        $smtpFrom = getenv('SMTP_FROM') ?: null;

        if (!empty($body['smtp_host'])) $smtpHost = $body['smtp_host'];
        if (!empty($body['smtp_port'])) $smtpPort = $body['smtp_port'];
        if (!empty($body['smtp_user'])) $smtpUser = $body['smtp_user'];
        if (!empty($body['smtp_pass'])) $smtpPass = $body['smtp_pass'];
        if (!empty($body['smtp_secure'])) $smtpSecure = $body['smtp_secure'];
        if (!empty($body['smtp_from'])) $smtpFrom = $body['smtp_from'];

        if (empty($smtpFrom) && !empty($smtpUser)) $smtpFrom = $smtpUser;
        if (empty($smtpFrom)) $smtpFrom = 'no-reply@' . ($host ?? 'localhost');

        // If SMTP host not set via env, try database tables (configuracoes first, then settings)
        if (!$smtpHost) {
            try {
                // Try old 'configuracoes' table first (columns: chave, valor)
                $stmt = $db->prepare("SELECT chave AS k, valor AS v FROM configuracoes WHERE chave IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_secure','smtp_from')");
                $stmt->execute();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (PDOException $pe) {
                // If table not found, fallback to 'settings' table (columns: key_name, value)
                if ($pe->getCode() === '42S02') {
                    try {
                        $stmt = $db->prepare("SELECT key_name AS k, value AS v FROM settings WHERE key_name IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_secure','smtp_from')");
                        $stmt->execute();
                        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    } catch (Exception $e) {
                        $rows = [];
                    }
                } else {
                    $rows = [];
                }
            }

            foreach ($rows as $r) {
                $key = $r['k'] ?? null;
                $val = $r['v'] ?? null;
                if (!$key) continue;
                switch ($key) {
                    case 'smtp_host':
                        $smtpHost = $smtpHost ?: $val;
                        break;
                    case 'smtp_port':
                        $smtpPort = $smtpPort ?: $val;
                        break;
                    case 'smtp_user':
                        $smtpUser = $smtpUser ?: $val;
                        break;
                    case 'smtp_pass':
                        $smtpPass = $smtpPass ?: $val;
                        break;
                    case 'smtp_secure':
                        $smtpSecure = $smtpSecure ?: $val;
                        break;
                    case 'smtp_from':
                        $smtpFrom = $smtpFrom ?: $val;
                        break;
                }
            }
        }

        // On Windows/XAMPP php.ini may define SMTP/smtp_port for mail() function.
        // Use those values as a fallback for PHPMailer SMTP if nothing else configured.
        if (empty($smtpHost)) {
            $iniSmtp = ini_get('SMTP');
            $iniPort = ini_get('smtp_port');
            if (!empty($iniSmtp)) {
                $smtpHost = $iniSmtp;
                if (!empty($iniPort)) $smtpPort = $smtpPort ?: $iniPort;
                helper_log_send('info', 'using php.ini SMTP as fallback', ['smtpHost' => $smtpHost, 'smtpPort' => $smtpPort]);
            }
        }

    // Collect which attachments were actually included or missing (unique per send)
    $attachments_included_map = [];
    $attachments_missing_map = [];

    foreach ($recipients as $r) {
            $to = is_array($r) ? ($r['email'] ?? '') : (is_string($r) ? $r : '');
            $name = is_array($r) ? ($r['name'] ?? '') : '';
            if (empty($to)) {
                $failed[] = ['recipient' => $r, 'reason' => 'missing email'];
                continue;
            }

            $subject = "Tabela: " . ($table['name'] ?? 'Tabela');
            $bodyHtml = "<p>Olá " . htmlentities($name ?: $to) . ",</p>";
            $bodyHtml .= "<p>Segue a tabela <strong>" . htmlentities($table['name'] ?? '') . "</strong>.</p>";
            if (!empty($table['description'])) $bodyHtml .= "<p>" . nl2br(htmlentities($table['description'])) . "</p>";
            if (count($attachments) > 0) {
                $bodyHtml .= "<p>Anexos:</p><ul>";
                foreach ($attachments as $att) {
                    $p = $att['path'] ?? '';
                    $url = $p ? ($base . $p) : '';
                    $bodyHtml .= "<li>" . htmlentities($att['name'] ?? 'arquivo') . " - <a href=\"" . htmlentities($url) . "\">Download</a></li>";
                }
                $bodyHtml .= "</ul>";
            }
            $bodyHtml .= "<p>Atenciosamente,<br/>Equipe</p>";

            // Use PHPMailer if available and an SMTP host is configured.
            // Allow unauthenticated SMTP (useful for local senders) when smtp_user is not provided.
            if ($usePHPMailer && $smtpHost) {
                $mail = new PHPMailer\PHPMailer\PHPMailer(true);
                try {
                    $mail->isSMTP();
                    $mail->Host = $smtpHost;
                    // Enable SMTPAuth only when user is provided
                    if (!empty($smtpUser)) {
                        $mail->SMTPAuth = true;
                        $mail->Username = $smtpUser;
                        $mail->Password = $smtpPass;
                    } else {
                        $mail->SMTPAuth = false;
                    }

                    // Configure secure transport if specified
                    if (!empty($smtpSecure)) {
                        // Accept values like 'ssl' or 'tls'
                        $mail->SMTPSecure = $smtpSecure;
                    }
                    $mail->Port = (int)$smtpPort;

                    // Allow self-signed certs in local environments (safe for dev)
                    $mail->SMTPOptions = [
                        'ssl' => [
                            'verify_peer' => false,
                            'verify_peer_name' => false,
                            'allow_self_signed' => true,
                        ],
                    ];

                    $fromToUse = null;
                    if (!empty($smtpFrom) && filter_var($smtpFrom, FILTER_VALIDATE_EMAIL)) $fromToUse = $smtpFrom;
                    elseif (!empty($smtpUser) && filter_var($smtpUser, FILTER_VALIDATE_EMAIL)) $fromToUse = $smtpUser;
                    if (empty($fromToUse)) {
                        helper_log_send('error', 'No valid From address', ['smtpFrom' => $smtpFrom, 'smtpUser' => $smtpUser]);
                        throw new Exception('No valid From address available for PHPMailer');
                    }

                    $mail->setFrom($fromToUse);
                    $mail->addAddress($to, $name ?: null);
                    $mail->isHTML(true);
                    $mail->Subject = $subject;
                    $mail->Body = $bodyHtml;

                            // Ensure attachments have valid paths; if not, try to resolve from uploads dir
                            foreach ($attachments as $att) {
                                $p = $att['path'] ?? '';
                                // If no path stored, attempt to find uploaded file by name
                                if (empty($p) && !empty($att['name'])) {
                                    $uploadDir = realpath(__DIR__ . '/../../uploads');
                                    if ($uploadDir && is_dir($uploadDir)) {
                                        // sanitized name used when saving files
                                        $san = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', basename($att['name']));
                                        $pattern = $uploadDir . '/*_' . $san;
                                        $matches = glob($pattern);
                                        if ($matches && count($matches) > 0) {
                                            $found = $matches[0];
                                            $p = '/uploads/' . basename($found);
                                            helper_log_send('info', 'resolved attachment path from uploads', ['name' => $att['name'], 'found' => $p]);
                                        } else {
                                            helper_log_send('warn', 'could not resolve attachment path', ['name' => $att['name'], 'pattern' => $pattern]);
                                        }
                                    }
                                }

                                if ($p) {
                                    // original code expected files under public/ path
                                    $fs = realpath(__DIR__ . '/../../public' . $p);
                                    // Also allow direct uploads dir if public path didn't resolve
                                    if (!($fs && file_exists($fs))) {
                                        $alt = realpath(__DIR__ . '/../../uploads' . '/' . basename($p));
                                        if ($alt && file_exists($alt)) $fs = $alt;
                                    }
                                    if ($fs && file_exists($fs)) {
                                        $mail->addAttachment($fs, $att['name'] ?? null);
                                        $attachments_included_map[$att['name'] ?? $fs] = true;
                                    } else {
                                        helper_log_send('warn', 'attachment file not found on disk', ['path' => $p, 'name' => $att['name'] ?? null]);
                                        $attachments_missing_map[$att['name'] ?? $p] = true;
                                    }
                                }
                            }

                    $mail->send();
                    $sent++;
                    $statuses[] = ['recipient' => $to, 'name' => $name, 'status' => 'sent'];
                } catch (Exception $ex) {
                    $mailError = $mail->ErrorInfo ?? null;
                    $reasonParts = [];
                    if ($mailError) $reasonParts[] = $mailError;
                    if ($ex->getMessage()) $reasonParts[] = $ex->getMessage();
                    $reason = implode(' | ', $reasonParts) ?: 'PHPMailer error';
                    helper_log_send('error', 'PHPMailer failed to send', ['to' => $to, 'smtp' => ['host' => $smtpHost, 'port' => $smtpPort, 'user' => $smtpUser, 'secure' => $smtpSecure], 'reason' => $reason]);
                    $failed[] = ['recipient' => $to, 'reason' => $reason];
                    $statuses[] = ['recipient' => $to, 'name' => $name, 'status' => 'failed', 'reason' => $reason];
                }
            } else {
                // Fall back to PHP mail() with improved detection and logging.
                $fromToUse = null;
                if (!empty($smtpFrom) && filter_var($smtpFrom, FILTER_VALIDATE_EMAIL)) $fromToUse = $smtpFrom;
                elseif (!empty($smtpUser) && filter_var($smtpUser, FILTER_VALIDATE_EMAIL)) $fromToUse = $smtpUser;
                // try php.ini sendmail_from
                $iniSendFrom = ini_get('sendmail_from');
                if (empty($fromToUse) && !empty($iniSendFrom) && filter_var($iniSendFrom, FILTER_VALIDATE_EMAIL)) $fromToUse = $iniSendFrom;
                if (empty($fromToUse)) $fromToUse = 'no-reply@' . ($host ?? 'localhost');

                $headers = "MIME-Version: 1.0" . "\r\n";
                $headers .= "Content-type: text/html; charset=UTF-8" . "\r\n";
                $headers .= "From: " . $fromToUse . "\r\n";

                $iniSmtp = ini_get('SMTP');
                $iniPort = ini_get('smtp_port');
                $phpOs = PHP_OS;

                // Try to set envelope-from on non-Windows platforms
                $params = '';
                if (stripos($phpOs, 'WIN') === false) {
                    $params = '-f' . $fromToUse;
                }

                // Attempt mail() call
                if ($params !== '') {
                    $ok = @mail($to, $subject, $bodyHtml, $headers, $params);
                } else {
                    $ok = @mail($to, $subject, $bodyHtml, $headers);
                }

                if ($ok) {
                    helper_log_send('info', 'mail() sent (fallback)', ['to' => $to, 'from' => $fromToUse, 'php_ini_smtp' => $iniSmtp, 'php_ini_smtp_port' => $iniPort, 'php_os' => $phpOs]);
                    $sent++;
                    $statuses[] = ['recipient' => $to, 'name' => $name, 'status' => 'sent'];
                } else {
                    $phpLastErr = error_get_last();
                    $phpErrMsg = $phpLastErr['message'] ?? null;
                    $detail = ['to' => $to, 'from' => $fromToUse, 'smtpConfigured' => (bool)$smtpHost, 'usePHPMailer' => $usePHPMailer, 'smtpHost' => $smtpHost, 'smtpPort' => $smtpPort, 'smtpUser' => $smtpUser, 'php_ini_SMTP' => $iniSmtp, 'php_ini_smtp_port' => $iniPort, 'php_os' => $phpOs, 'php_error' => $phpErrMsg];
                    helper_log_send('error', 'mail() fallback failed', $detail);
                    $reason = 'mail() failed or PHPMailer not available' . ($phpErrMsg ? (': ' . $phpErrMsg) : '');
                    $failed[] = ['recipient' => $to, 'reason' => $reason];
                    $statuses[] = ['recipient' => $to, 'name' => $name, 'status' => 'failed', 'reason' => $reason];
                }
            }
        }

        // Persist history
        try {
            $recNames = array_map(function ($r) {
                if (is_array($r)) return $r['name'] ?? ($r['email'] ?? '');
                return is_string($r) ? $r : '';
            }, $recipients);
            $recipientsStr = substr(implode(',', array_filter($recNames, function ($v) {
                return strlen(trim($v)) > 0;
            })), 0, 100);
            $total = is_array($recipients) ? count($recipients) : 0;
            if ($sent === $total && $total > 0) $histStatus = 'Enviado';
            elseif ($sent === 0) $histStatus = 'Erro';
            else $histStatus = 'Parcial';

            $typeToSave = $body['type'] ?? $body['__inferred_type'] ?? null;
            if ($typeToSave !== null) {
                $stmt = $db->prepare("INSERT INTO history (table_id, channel, recipients, status, \"type\") VALUES (:table_id, :channel, :recipients, :status, :type)");
                $stmt->execute([':table_id' => $tableId, ':channel' => $channel, ':recipients' => $recipientsStr, ':status' => $histStatus, ':type' => $typeToSave]);
            } else {
                $stmt = $db->prepare("INSERT INTO history (table_id, channel, recipients, status) VALUES (:table_id, :channel, :recipients, :status)");
                $stmt->execute([':table_id' => $tableId, ':channel' => $channel, ':recipients' => $recipientsStr, ':status' => $histStatus]);
            }
            helper_log_send('info', 'history saved', ['tableId' => $tableId, 'recipients' => $recipientsStr, 'status' => $histStatus]);
        } catch (Exception $e) {
            helper_log_send('error', 'failed saving history: ' . $e->getMessage());
        }

        $attachments_included = array_values(array_keys($attachments_included_map));
        $attachments_missing = array_values(array_keys($attachments_missing_map));
        return [
            'sent' => $sent,
            'failed' => $failed,
            'usePHPMailer' => $usePHPMailer,
            'statuses' => $statuses,
            'attachments_included' => $attachments_included,
            'attachments_missing' => $attachments_missing,
        ];
    } catch (Exception $e) {
        helper_log_send('error', 'exception sending sales table: ' . $e->getMessage());
        return ['error' => 'Erro no servidor', 'message' => $e->getMessage()];
    }
}
