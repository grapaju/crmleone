<?php
header("Access-Control-Allow-Origin: *"); header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); header("Access-Control-Allow-Headers: Content-Type, Authorization"); header('Content-Type: application/json'); if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
require_once '../src/config/database.php'; require_once '../src/models/AgentUnitAccess.php';
$db=getDatabaseConnection(); $model=new AgentUnitAccess($db);
$agentId=isset($_GET['agent_id'])?(int)$_GET['agent_id']:0; if(!$agentId){ http_response_code(400); echo json_encode(['error'=>'agent_id requerido']); exit; }
if($_SERVER['REQUEST_METHOD']==='GET'){ echo json_encode($model->listIds($agentId)); exit; }
if($_SERVER['REQUEST_METHOD']==='POST'){ $body=json_decode(file_get_contents('php://input'),true)?:[]; $ids=$body['unit_ids']??[]; if(!is_array($ids)) $ids=[]; $ok=$model->replace($agentId,$ids,$body['can_edit_default']??0); if(!$ok){ http_response_code(500); echo json_encode(['error'=>'Falha ao salvar']); } else { echo json_encode(['agent_id'=>$agentId,'unit_ids'=>$model->listIds($agentId)]); } exit; }
http_response_code(405); echo json_encode(['error'=>'Método não permitido']);
