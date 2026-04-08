<?php
ini_set('display_errors','0');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){ http_response_code(204); exit; }
require_once '../src/config/database.php';
$pdo = getDatabaseConnection();

function json_input(){ $raw=file_get_contents('php://input'); if(!$raw) return []; $d=json_decode($raw,true); return is_array($d)?$d:[]; }
$method = $_SERVER['REQUEST_METHOD'];

try {
  if($method==='GET'){
    if(isset($_GET['id'])){
      $st=$pdo->prepare('SELECT * FROM unit_types WHERE id=?');
      $st->execute([$_GET['id']]);
      $row=$st->fetch(PDO::FETCH_ASSOC);
      if(!$row){ http_response_code(404); echo json_encode(['error'=>'Not found']); exit; }
      echo json_encode(['data'=>$row]);
      exit;
    }
    $st=$pdo->query('SELECT * FROM unit_types ORDER BY COALESCE(name, position) ASC');
    echo json_encode(['data'=>$st->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
  }
  elseif($method==='POST'){
    $in=json_input();
    $name = isset($in['name']) ? trim((string)$in['name']) : null;
    $pos = isset($in['position']) ? trim((string)$in['position']) : null;
    $parking = isset($in['parking_spots']) ? (int)$in['parking_spots'] : 0;
    $bedrooms = $in['bedrooms'] ?? '';
    $area = isset($in['area']) ? (float)$in['area'] : null;
    $base_price = isset($in['base_price']) ? (float)$in['base_price'] : null;
    $valuation = isset($in['valuation_factor']) ? (float)$in['valuation_factor'] : null;
    if(!$pos && $name){ $pos = $name; }
    if(($pos === null || $pos === '') || $area === null || $area <= 0){
      http_response_code(400);
      echo json_encode(['error'=>'name/position e area sao obrigatorios']);
      exit;
    }

    $ins=$pdo->prepare('INSERT INTO unit_types (name, position, parking_spots, bedrooms, area, valuation_factor, base_price) VALUES (?,?,?,?,?,?,?)');
    $ins->execute([$name,$pos,$parking,$bedrooms,$area,$valuation,$base_price]);
    $id=(int)$pdo->lastInsertId();

    $st=$pdo->prepare('SELECT * FROM unit_types WHERE id=?');
    $st->execute([$id]);
    $row=$st->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['data'=>$row ?: ['id'=>$id]]);
    exit;
  }
  elseif($method==='PUT'){
    if(!isset($_GET['id'])){ http_response_code(400); echo json_encode(['error'=>'id obrigatório']); exit; }
    $id=(int)$_GET['id'];
    $in=json_input();
    $fields=[]; $vals=[];
    foreach(['name','position','parking_spots','bedrooms','area','valuation_factor','base_price'] as $f){
      if(array_key_exists($f,$in)){ $fields[]="$f=?"; $vals[]=$in[$f]; }
    }
    if(!$fields){ echo json_encode(['data'=>['id'=>$id]]); exit; }
    $vals[]=$id;
    $sql='UPDATE unit_types SET '.implode(', ',$fields).' WHERE id=?';
    $st=$pdo->prepare($sql); $st->execute($vals);
    echo json_encode(['data'=>['id'=>$id]]);
    exit;
  }
  elseif($method==='DELETE'){
    if(!isset($_GET['id'])){ http_response_code(400); echo json_encode(['error'=>'id obrigatório']); exit; }
    $id=(int)$_GET['id'];
    $st=$pdo->prepare('DELETE FROM unit_types WHERE id=?');
    $st->execute([$id]);
    echo json_encode(['data'=>true]);
    exit;
  }
  else {
    http_response_code(405); echo json_encode(['error'=>'Method not allowed']);
  }
} catch(PDOException $e){
  if(in_array($e->getCode(), ['23505','23000'], true)){
    http_response_code(409);
    echo json_encode(['error'=>'Conflito de dados ao salvar tipologia. Verifique posicao/nome/area.']);
    exit;
  }
  http_response_code(500); echo json_encode(['error'=>$e->getMessage()]);
} catch(Throwable $e){ http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
