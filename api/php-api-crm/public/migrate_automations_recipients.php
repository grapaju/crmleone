<?php
// Run once to convert automations.recipients from comma names to JSON recipientsList when possible.
require_once __DIR__ . '/../src/config/database.php';

$db = getDatabaseConnection();
try {
    $stmt = $db->prepare("SELECT id, recipients FROM automations");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $updated = 0;
    foreach ($rows as $r) {
        $id = $r['id'];
        $rec = $r['recipients'];
        if (!$rec) continue;
        // skip if already JSON
        $decoded = json_decode($rec, true);
        if (is_array($decoded)) continue;
        $tokens = array_filter(array_map('trim', explode(',', $rec)));
        if (count($tokens) === 0) continue;
        $recipients = [];
        foreach ($tokens as $t) {
            // try to find in leads or contatos
            $q = $db->prepare("SELECT nome AS name, email FROM leads WHERE nome = :t OR email = :t LIMIT 1");
            $q->execute([':t' => $t]);
            $found = $q->fetch(PDO::FETCH_ASSOC);
            if (!$found) {
                $q2 = $db->prepare("SELECT nome AS name, email FROM contatos WHERE nome = :t OR email = :t LIMIT 1");
                $q2->execute([':t' => $t]);
                $found = $q2->fetch(PDO::FETCH_ASSOC);
            }
            if ($found) {
                $recipients[] = ['name' => $found['name'] ?: $t, 'email' => $found['email'] ?: ''];
            } else {
                $isEmail = filter_var($t, FILTER_VALIDATE_EMAIL);
                $recipients[] = ['name' => $t, 'email' => $isEmail ? $t : ''];
            }
        }
        $json = json_encode($recipients, JSON_UNESCAPED_UNICODE);
        $u = $db->prepare("UPDATE automations SET recipients = :rec WHERE id = :id");
        $u->execute([':rec' => $json, ':id' => $id]);
        $updated++;
    }
    echo "Updated: $updated\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}

