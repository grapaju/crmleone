<?php
ini_set('display_errors','0');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../src/config/database.php';
$pdo = getDatabaseConnection();

$method = $_SERVER['REQUEST_METHOD'];

// util simples para JSON seguro
function json_input() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

try {
    if ($method === 'GET') {
        if (isset($_GET['latest'])) {
            $stmt = $pdo->query("SELECT * FROM cub ORDER BY vigencia DESC, id DESC LIMIT 1");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['data'=>$row]);
            exit;
        }
        // list all (limit basic)
        $stmt = $pdo->query("SELECT * FROM cub ORDER BY vigencia DESC, id DESC LIMIT 120");
        echo json_encode(['data'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    } elseif ($method === 'POST') {
        $input = json_input();
        $valor = isset($input['valorAtual']) ? (float)$input['valorAtual'] : null;
        $vigencia = $input['vigencia'] ?? null; // formato YYYY-MM ou YYYY-MM-01
        $variacao = isset($input['variacao']) ? (float)$input['variacao'] : null;
        if (!$valor || !$vigencia) {
            http_response_code(400);
            echo json_encode(['error'=>'valorAtual e vigencia são obrigatórios']);
            exit;
        }
        // normaliza vigencia para YYYY-MM-01
        if (preg_match('/^\d{4}-\d{2}$/', $vigencia)) {
            $vigencia .= '-01';
        }
        // detectar colunas disponíveis
        $cols = [];
        try {
            $d = $pdo->query("DESCRIBE cub");
            $all = $d->fetchAll(PDO::FETCH_COLUMN);
            if (is_array($all)) $cols = array_flip($all);
        } catch (Throwable $ex) {
            $cols = [];
        }
        // verifica se já existe esse mês
        $chk = $pdo->prepare("SELECT id FROM cub WHERE vigencia = ? LIMIT 1");
        $chk->execute([$vigencia]);
        if ($row = $chk->fetch(PDO::FETCH_ASSOC)) {
            // update existente
            if (isset($cols['atualizado_em'])) {
                $upd = $pdo->prepare("UPDATE cub SET valorAtual = ?, variacao = ?, atualizado_em = NOW() WHERE id = ?");
                $upd->execute([$valor, $variacao, $row['id']]);
            } else {
                $upd = $pdo->prepare("UPDATE cub SET valorAtual = ?, variacao = ? WHERE id = ?");
                $upd->execute([$valor, $variacao, $row['id']]);
            }
            echo json_encode(['data'=>['id'=>$row['id'], 'valorAtual'=>$valor, 'vigencia'=>$vigencia, 'variacao'=>$variacao]]);
            exit;
        }
        // build insert dinamicamente
        $insertCols = ['valorAtual','vigencia','variacao'];
        $placeholders = ['?','?','?'];
        $values = [$valor, $vigencia, $variacao];
        if (isset($cols['criado_em'])) { $insertCols[] = 'criado_em'; $placeholders[] = isset($cols['atualizado_em']) ? 'NOW()' : 'NOW()'; }
        if (isset($cols['atualizado_em'])) { $insertCols[] = 'atualizado_em'; $placeholders[] = 'NOW()'; }
        $colsSql = implode(', ', $insertCols);
        $phSql = implode(', ', $placeholders);
        $sqlIns = "INSERT INTO cub ($colsSql) VALUES ($phSql)";
        $ins = $pdo->prepare($sqlIns);
        // bind only the first 3 (dynamic NOW() are inline)
        $ins->execute($values);
        $id = $pdo->lastInsertId();
        echo json_encode(['data'=>['id'=>$id, 'valorAtual'=>$valor, 'vigencia'=>$vigencia, 'variacao'=>$variacao]]);
        exit;
    } else {
        http_response_code(405);
        echo json_encode(['error'=>'Method not allowed']);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error'=>$e->getMessage()]);
}
