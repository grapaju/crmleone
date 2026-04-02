<?php
// lists features/caracteristicas and writes JSON to tmp/features_cli.json
require_once __DIR__ . '/../api/php-api-crm/src/config/database.php';
$outFile = __DIR__ . '/../tmp/features_cli.json';
try {
    // detect table name
    $stmt = $pdo->prepare("SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_NAME IN ('features','caracteristicas')");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('features', $rows)) {
        $table = 'features';
        $nameCol = 'name';
    } elseif (in_array('caracteristicas', $rows)) {
        $table = 'caracteristicas';
        $nameCol = 'nome';
    } else {
        // fallback attempt both
        $table = 'features';
        $nameCol = 'name';
    }

    $sql = "SELECT id, `" . $nameCol . "` AS name FROM `" . $table . "` ORDER BY id";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    file_put_contents($outFile, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
} catch (Exception $e) {
    file_put_contents($outFile, json_encode(['error' => $e->getMessage()], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
echo $outFile;
