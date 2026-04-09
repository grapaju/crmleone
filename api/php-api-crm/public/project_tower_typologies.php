<?php
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once '../src/config/database.php';
$pdo = getDatabaseConnection();

function json_input() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function normalize_typology_payload($in) {
    $name = isset($in['name']) ? trim((string)$in['name']) : null;
    $position = isset($in['position']) ? trim((string)$in['position']) : null;
    if ((!$position || $position === '') && $name) {
        $position = $name;
    }

    $area = isset($in['area']) ? (float)$in['area'] : null;
    $valuation = isset($in['valuation_factor']) ? (float)$in['valuation_factor'] : null;
    $unitTypeId = isset($in['unit_type_id']) && $in['unit_type_id'] !== '' ? (int)$in['unit_type_id'] : null;
    $parking = isset($in['parking_spots']) ? (int)$in['parking_spots'] : 0;
    $bedrooms = $in['bedrooms'] ?? null;
    $suites = $in['suites'] ?? null;
    $floorsStart = isset($in['floors_start']) && $in['floors_start'] !== '' ? (int)$in['floors_start'] : null;
    $floorsEnd = isset($in['floors_end']) && $in['floors_end'] !== '' ? (int)$in['floors_end'] : null;
    $perFloorQty = isset($in['per_floor_quantity']) && $in['per_floor_quantity'] !== '' ? (int)$in['per_floor_quantity'] : 1;

    return [
        'name' => $name,
        'position' => $position,
        'unit_type_id' => $unitTypeId,
        'parking_spots' => $parking,
        'bedrooms' => $bedrooms,
        'suites' => $suites,
        'area' => $area,
        'valuation_factor' => $valuation,
        'floors_start' => $floorsStart,
        'floors_end' => $floorsEnd,
        'per_floor_quantity' => $perFloorQty,
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $st = $pdo->prepare('SELECT * FROM project_tower_unit_types WHERE id = ?');
            $st->execute([(int)$_GET['id']]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                http_response_code(404);
                echo json_encode(['error' => 'Not found']);
                exit;
            }
            echo json_encode(['data' => $row]);
            exit;
        }

        if (!isset($_GET['project_id']) && !isset($_GET['obra_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'project_id é obrigatório']);
            exit;
        }

        $projectId = isset($_GET['project_id']) ? (int)$_GET['project_id'] : (int)$_GET['obra_id'];
        $towerId = isset($_GET['tower_id']) ? (int)$_GET['tower_id'] : null;

        if ($towerId) {
            $st = $pdo->prepare('SELECT * FROM project_tower_unit_types WHERE project_id = ? AND tower_id = ? ORDER BY COALESCE(name, position) ASC');
            $st->execute([$projectId, $towerId]);
        } else {
            $st = $pdo->prepare('SELECT * FROM project_tower_unit_types WHERE project_id = ? ORDER BY tower_id ASC, COALESCE(name, position) ASC');
            $st->execute([$projectId]);
        }

        echo json_encode(['data' => $st->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }

    if ($method === 'POST') {
        $action = $_GET['action'] ?? null;
        $in = json_input();

        if ($action === 'replace') {
            $projectId = isset($in['project_id']) ? (int)$in['project_id'] : (isset($in['obra_id']) ? (int)$in['obra_id'] : 0);
            $towerId = isset($in['tower_id']) ? (int)$in['tower_id'] : 0;
            $typologies = isset($in['typologies']) && is_array($in['typologies']) ? $in['typologies'] : [];

            if ($projectId <= 0 || $towerId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'project_id e tower_id são obrigatórios']);
                exit;
            }

            $pdo->beginTransaction();
            $del = $pdo->prepare('DELETE FROM project_tower_unit_types WHERE project_id = ? AND tower_id = ?');
            $del->execute([$projectId, $towerId]);

            $ins = $pdo->prepare('INSERT INTO project_tower_unit_types (project_id, tower_id, unit_type_id, name, position, parking_spots, bedrooms, suites, area, valuation_factor, floors_start, floors_end, per_floor_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

            $inserted = 0;
            foreach ($typologies as $tp) {
                $row = normalize_typology_payload($tp);
                if (!$row['position'] || $row['position'] === '' || $row['area'] === null || $row['area'] <= 0) {
                    continue;
                }

                $ins->execute([
                    $projectId,
                    $towerId,
                    $row['unit_type_id'],
                    $row['name'],
                    $row['position'],
                    $row['parking_spots'],
                    $row['bedrooms'],
                    $row['suites'],
                    $row['area'],
                    $row['valuation_factor'],
                    $row['floors_start'],
                    $row['floors_end'],
                    $row['per_floor_quantity'],
                ]);
                $inserted++;
            }

            $pdo->commit();

            $st = $pdo->prepare('SELECT * FROM project_tower_unit_types WHERE project_id = ? AND tower_id = ? ORDER BY COALESCE(name, position) ASC');
            $st->execute([$projectId, $towerId]);
            echo json_encode([
                'data' => $st->fetchAll(PDO::FETCH_ASSOC),
                'meta' => ['inserted' => $inserted],
            ]);
            exit;
        }

        $projectId = isset($in['project_id']) ? (int)$in['project_id'] : (isset($in['obra_id']) ? (int)$in['obra_id'] : 0);
        $towerId = isset($in['tower_id']) ? (int)$in['tower_id'] : 0;
        $row = normalize_typology_payload($in);

        if ($projectId <= 0 || $towerId <= 0 || !$row['position'] || $row['position'] === '' || $row['area'] === null || $row['area'] <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'project_id, tower_id, position e area são obrigatórios']);
            exit;
        }

        $ins = $pdo->prepare('INSERT INTO project_tower_unit_types (project_id, tower_id, unit_type_id, name, position, parking_spots, bedrooms, suites, area, valuation_factor, floors_start, floors_end, per_floor_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id');
        $ins->execute([
            $projectId,
            $towerId,
            $row['unit_type_id'],
            $row['name'],
            $row['position'],
            $row['parking_spots'],
            $row['bedrooms'],
            $row['suites'],
            $row['area'],
            $row['valuation_factor'],
            $row['floors_start'],
            $row['floors_end'],
            $row['per_floor_quantity'],
        ]);

        $newId = (int)$ins->fetchColumn();
        $st = $pdo->prepare('SELECT * FROM project_tower_unit_types WHERE id = ?');
        $st->execute([$newId]);
        echo json_encode(['data' => $st->fetch(PDO::FETCH_ASSOC)]);
        exit;
    }

    if ($method === 'PUT') {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'id obrigatório']);
            exit;
        }

        $id = (int)$_GET['id'];
        $in = json_input();
        $row = normalize_typology_payload($in);

        $fields = [];
        $vals = [];
        foreach (['project_id', 'tower_id', 'unit_type_id', 'name', 'position', 'parking_spots', 'bedrooms', 'suites', 'area', 'valuation_factor', 'floors_start', 'floors_end', 'per_floor_quantity'] as $col) {
            if (!array_key_exists($col, $in)) continue;
            $fields[] = "$col = ?";
            if ($col === 'project_id' || $col === 'tower_id') {
                $vals[] = (int)$in[$col];
            } elseif (array_key_exists($col, $row)) {
                $vals[] = $row[$col];
            } else {
                $vals[] = $in[$col];
            }
        }

        if (!$fields) {
            echo json_encode(['data' => ['id' => $id]]);
            exit;
        }

        $vals[] = $id;
        $sql = 'UPDATE project_tower_unit_types SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $st = $pdo->prepare($sql);
        $st->execute($vals);

        $st = $pdo->prepare('SELECT * FROM project_tower_unit_types WHERE id = ?');
        $st->execute([$id]);
        echo json_encode(['data' => $st->fetch(PDO::FETCH_ASSOC)]);
        exit;
    }

    if ($method === 'DELETE') {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'id obrigatório']);
            exit;
        }

        $id = (int)$_GET['id'];
        $st = $pdo->prepare('DELETE FROM project_tower_unit_types WHERE id = ?');
        $st->execute([$id]);
        echo json_encode(['data' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
