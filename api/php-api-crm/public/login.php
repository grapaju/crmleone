<?php
header("Access-Control-Allow-Origin: http://localhost:5173"); // ajuste para o domínio do frontend
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once '../src/config/database.php'; // Adicione esta linha

// ...restante do seu código...

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['email'], $data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email e senha são obrigatórios.']);
    exit;
}

$email = $data['email'];
$password = $data['password'];

$conn = getDatabaseConnection();

$stmt = $conn->prepare("SELECT id, name, email, password, role FROM agents WHERE email = ? AND status = 'Ativo' LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($password, $user['password'])) {
    session_start(); // Inicia a sessão
    $_SESSION['user_id'] = $user['id']; // Salva o ID do usuário na sessão
    unset($user['password']); // Nunca envie a senha!
    echo json_encode($user);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Credenciais inválidas.']);
}
