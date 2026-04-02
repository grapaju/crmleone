<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/config/database.php';

$pdo = null;
try {
    $pdo = getDatabaseConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed', 'details' => $e->getMessage()]);
    exit;
}

try {
    // encontrar propriedades que têm mais de uma imagem marcada como primary
    $sql = "SELECT property_id, COUNT(*) as cnt FROM property_images WHERE is_primary = 1 GROUP BY property_id HAVING cnt > 1";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $fixed = [];
    foreach ($rows as $r) {
        $propertyId = $r['property_id'];
        // escolher a imagem mais recente como primary
        $pickSql = "SELECT id FROM property_images WHERE property_id = ? AND is_primary = 1 ORDER BY created_at DESC";
        $pick = $pdo->prepare($pickSql);
        $pick->execute([$propertyId]);
        $ids = $pick->fetchAll(PDO::FETCH_COLUMN);
        if (!$ids || count($ids) <= 1) continue;

        $keep = $ids[0];
        $others = array_slice($ids, 1);

        $pdo->beginTransaction();
        // desmarcar as demais
        $in = implode(',', array_fill(0, count($others), '?'));
        $unsetSql = "UPDATE property_images SET is_primary = 0 WHERE id IN ($in)";
        $unset = $pdo->prepare($unsetSql);
        $unset->execute($others);
        $pdo->commit();

        $fixed[] = ['property_id' => $propertyId, 'kept' => $keep, 'unset_count' => count($others)];
    }

    echo json_encode(['fixed' => $fixed]);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

