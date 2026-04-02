<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/config/database.php';

try {
    $pdo = getDatabaseConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection error", "details" => $e->getMessage()]);
    exit;
}

function tableExists($pdo, $name)
{
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
        $stmt->execute([$name]);
        return (bool) $stmt->fetchColumn();
    } catch (Exception $e) {
        return false;
    }
}

$junctionTable = null;
$colProperty = null;
$colFeature = null;
$featuresTableDetected = null;

if (tableExists($pdo, 'imoveis_caracteristicas')) {
    $junctionTable = 'imoveis_caracteristicas';
    $colProperty = 'imovel_id';
    $colFeature = 'caracteristica_id';
    $featuresTableDetected = tableExists($pdo, 'caracteristicas') ? 'caracteristicas' : null;
} elseif (tableExists($pdo, 'property_features')) {
    $junctionTable = 'property_features';
    $colProperty = 'property_id';
    $colFeature = 'feature_id';
    $featuresTableDetected = tableExists($pdo, 'features') ? 'features' : null;
} else {
    http_response_code(500);
    echo json_encode(["error" => "No junction table found: imoveis_caracteristicas or property_features missing"]);
    exit;
}

$propertyId = $_GET['property_id'] ?? $_GET['id'] ?? null;
if (!$propertyId) {
    http_response_code(400);
    echo json_encode(["error" => "property_id (or id) is required as query param"]);
    exit;
}

try {
    // fetch junction rows
    $stmt = $pdo->prepare("SELECT * FROM {$junctionTable} WHERE {$colProperty} = ?");
    $stmt->execute([$propertyId]);
    $junctionRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [
        'junction_table' => $junctionTable,
        'property_col' => $colProperty,
        'feature_col' => $colFeature,
        'junction_rows' => $junctionRows,
    ];

    // If features table exists, also return the joined feature rows
    if ($featuresTableDetected) {
        $stmt2 = $pdo->prepare("SELECT f.* FROM {$featuresTableDetected} f JOIN {$junctionTable} j ON f.id = j.{$colFeature} WHERE j.{$colProperty} = ?");
        $stmt2->execute([$propertyId]);
        $features = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        $response['features'] = $features;
    }

    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "DB error", "details" => $e->getMessage()]);
}

?>