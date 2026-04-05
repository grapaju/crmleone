<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/config/database.php';

function respond($data, $code = 200){
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  $db = getDatabaseConnection();
  $method = $_SERVER['REQUEST_METHOD'];
  if ($method !== 'GET') {
    respond(['error' => 'Método não suportado'], 405);
  }

  // Aceita ?agent_id= para filtrar métricas de um agente específico (quando aplicável)
  $agentId = isset($_GET['agent_id']) ? intval($_GET['agent_id']) : null;

  // Determinar primeiro dia mês atual e mês anterior
  $tz = new DateTimeZone(getenv('PHP_APP_TZ') ?: 'America/Sao_Paulo');
  $now = new DateTime('now', $tz);
  $startCurrent = (clone $now)->modify('first day of this month')->setTime(0,0,0);
  $startPrev = (clone $startCurrent)->modify('-1 month');
  $endPrev = (clone $startCurrent); // limite exclusivo

  // Helpers para contagens parametrizadas
  $paramsBase = [];
  $agentFilterSql = '';
  if ($agentId) {
    $agentFilterSql = ' AND agent_id = :agent_id';
    $paramsBase[':agent_id'] = $agentId;
  }

  // 1) activitiesDone (conta lead_activities com status concluído / similar) - adaptável conforme regras reais
  // Consideramos status em ('Concluído','Concluido','Done') ou type em ('Visita','Ligar','Mensagem','Email') finalizados.
  $statusList = ["Concluído","Concluido","Done"]; // pode expandir
  $placeholders = implode(',', array_fill(0, count($statusList), '?'));

  $sqlActivities = "SELECT 
      SUM(CASE WHEN date >= ? AND date < ? THEN 1 ELSE 0 END) AS current_count,
      SUM(CASE WHEN date >= ? AND date < ? THEN 1 ELSE 0 END) AS prev_count
    FROM lead_activities
    WHERE status IN ($placeholders) $agentFilterSql";
  $stmt = $db->prepare($sqlActivities);
  $bind = [
    $startCurrent->format('Y-m-d H:i:s'), $now->format('Y-m-d H:i:s'), // janela mês atual até agora
    $startPrev->format('Y-m-d H:i:s'), $endPrev->format('Y-m-d H:i:s'), // mês anterior completo
    ...$statusList
  ];
  // Ajusta ordem: placeholders de status precisam vir antes se usados no IN dependendo do driver;
  // Para manter simples, reescrevemos unindo status inline em vez de bind (?) para IN.
  // Refazendo de forma segura (escape simples) - assumindo array controlado.
  $statusEsc = array_map(fn($s)=>$db->quote($s), $statusList);
  $sqlActivities = "SELECT 
      SUM(CASE WHEN date >= :sc AND date < :now THEN 1 ELSE 0 END) AS current_count,
      SUM(CASE WHEN date >= :sp AND date < :ec THEN 1 ELSE 0 END) AS prev_count
    FROM lead_activities
    WHERE status IN (" . implode(',', $statusEsc) . ") $agentFilterSql";
  $stmt = $db->prepare($sqlActivities);
  $paramsActs = array_merge($paramsBase, [
    ':sc' => $startCurrent->format('Y-m-d H:i:s'),
    ':now' => $now->format('Y-m-d H:i:s'),
    ':sp' => $startPrev->format('Y-m-d H:i:s'),
    ':ec' => $endPrev->format('Y-m-d H:i:s'),
  ]);
  $stmt->execute($paramsActs);
  $acts = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['current_count'=>0,'prev_count'=>0];

  // 2) contactsMade - número de contacts criados por created_at
  $sqlContacts = "SELECT 
      SUM(CASE WHEN created_at >= :sc AND created_at < :now THEN 1 ELSE 0 END) AS current_count,
      SUM(CASE WHEN created_at >= :sp AND created_at < :ec THEN 1 ELSE 0 END) AS prev_count
    FROM contacts WHERE 1=1" . ($agentId ? ' AND agent_id = :agent_id' : '');
  // Nota: tabela contacts na schema atual não possui agent_id; se não existir, ignoramos filtro.
  if (!columnExists($db, 'contacts', 'agent_id')) {
    $sqlContacts = str_replace(' AND agent_id = :agent_id','',$sqlContacts);
  }
  $stmt = $db->prepare($sqlContacts);
  $stmt->execute($paramsActs); // reusa params de datas (+ agent se existir)
  $contacts = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['current_count'=>0,'prev_count'=>0];

  // 3) dealsClosed - placeholder (não há tabela deals). Usamos appointments concluidos como proxy.
  $sqlDeals = "SELECT 
      SUM(CASE WHEN start >= :sc AND start < :now AND status IN ('Concluído','Concluido') THEN 1 ELSE 0 END) AS current_count,
      SUM(CASE WHEN start >= :sp AND start < :ec AND status IN ('Concluído','Concluido') THEN 1 ELSE 0 END) AS prev_count
    FROM appointments WHERE 1=1 $agentFilterSql";
  $stmt = $db->prepare($sqlDeals);
  $stmt->execute($paramsActs);
  $deals = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['current_count'=>0,'prev_count'=>0];

  $response = [
    'generatedAt' => $now->format(DateTime::ATOM),
    'agentId' => $agentId,
    'currentMonth' => [
      'start' => $startCurrent->format('Y-m-d'),
      'activitiesDone' => (int)$acts['current_count'],
      'contactsMade' => (int)$contacts['current_count'],
      'dealsClosed' => (int)$deals['current_count']
    ],
    'previousMonth' => [
      'start' => $startPrev->format('Y-m-d'),
      'activitiesDone' => (int)$acts['prev_count'],
      'contactsMade' => (int)$contacts['prev_count'],
      'dealsClosed' => (int)$deals['prev_count']
    ]
  ];
  respond($response);

} catch (Exception $e) {
  respond(['error' => 'server error', 'message' => $e->getMessage()], 500);
}

// Utilitário simples para checar existência de coluna
function columnExists(PDO $db, string $table, string $column): bool {
  try {
    $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = :table AND column_name = :column");
    $stmt->execute([':table' => $table, ':column' => $column]);
    return ((int)$stmt->fetchColumn()) > 0;
  } catch(Exception $e) { return false; }
}
