<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// allow common headers used by fetch/XHR and authorization tokens
header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With");

// respond to preflight immediately to avoid running DB connection and other logic
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // return 204 No Content with CORS headers
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/config/database.php';

// ensure logs dir exists
$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/property_features.log';

function pf_log($msg)
{
    global $logFile;
    $time = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "{$time} | {$msg}\n", FILE_APPEND);
}

try {
    $pdo = getDatabaseConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection error", "details" => $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

pf_log('raw body: ' . file_get_contents('php://input'));
// detect which table names/column names exist on this DB (support both pt-br and en)
function tableExists($pdo, $name)
{
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?");
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
    // fallback: try to detect any likely junction name
    pf_log('No known junction table found (imoveis_caracteristicas/property_features).');
    http_response_code(500);
    echo json_encode(["error" => "No junction table found: imoveis_caracteristicas or property_features missing"]);
    exit;
}

pf_log('Using junction table=' . $junctionTable . ' prop_col=' . $colProperty . ' feat_col=' . $colFeature . ' features_table=' . var_export($featuresTableDetected, true));

// Handle GET: return features for a property
if ($method === 'GET') {
    $propId = $_GET['property_id'] ?? $_GET['id'] ?? null;
    if (!$propId) {
        http_response_code(400);
        echo json_encode(["error" => "property_id (or id) is required"]);
        exit;
    }
    try {
        pf_log('GET handling for property_id=' . var_export($propId, true));
        if ($featuresTableDetected) {
            // return full feature rows joined
            $sql = "SELECT f.* FROM {$featuresTableDetected} f JOIN {$junctionTable} j ON f.id = j.{$colFeature} WHERE j.{$colProperty} = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$propId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['features' => $rows]);
        } else {
            // return feature ids only
            $sql = "SELECT {$colFeature} FROM {$junctionTable} WHERE {$colProperty} = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$propId]);
            $ids = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
            echo json_encode(['features' => $ids]);
        }
    } catch (Exception $e) {
        pf_log('GET Exception: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "DB error", "details" => $e->getMessage()]);
    }
    exit;
}

// Handle POST below
if ($method === 'POST') {
    // Expecting { property_id: number, features: [ids] }
    $propertyId = $input['property_id'] ?? null;
    $features = $input['features'] ?? [];
    if (!$propertyId) {
        http_response_code(400);
        echo json_encode(["error" => "property_id is required"]);
        exit;
    }

    try {
        pf_log('POST handling for property_id=' . var_export($propertyId, true) . ' features=' . var_export($features, true));
        $pdo->beginTransaction();
        // delete existing
        $stmtDel = $pdo->prepare("DELETE FROM {$junctionTable} WHERE {$colProperty} = ?");
        $stmtDel->execute([$propertyId]);
        $delCount = $stmtDel->rowCount();
        pf_log('deleted existing count=' . $delCount);

        $inserted = 0;
        if (is_array($features) && count($features) > 0) {
            $stmtIns = $pdo->prepare("INSERT INTO {$junctionTable} ({$colProperty}, {$colFeature}) VALUES (?, ?)");
            foreach ($features as $fid) {
                $stmtIns->execute([$propertyId, $fid]);
                $inserted += $stmtIns->rowCount();
            }
        }
        pf_log('inserted count=' . $inserted);

        $pdo->commit();
        pf_log('commit success');
        echo json_encode(["message" => "Características do imóvel atualizadas", "deleted" => $delCount, "inserted" => $inserted]);
    } catch (PDOException $pe) {
        $pdo->rollBack();
        pf_log('PDOException: ' . $pe->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "DB error", "details" => $pe->getMessage()]);
    } catch (Exception $ex) {
        pf_log('Exception: ' . $ex->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "General error", "details" => $ex->getMessage()]);
    }
    exit;
}

// For other methods, return method not allowed
http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
