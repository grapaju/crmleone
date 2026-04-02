<?php
require_once '../src/config/database.php';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $nome = "Administrador";
    $email = "admin@imovelcrm.com";
    $senha = "admin123"; // Você pode alterar para uma senha mais segura
    $senha_hash = password_hash($senha, PASSWORD_DEFAULT);

    // Verifica se já existe o usuário
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM agents WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() > 0) {
        echo "Usuário já cadastrado.\n";
    } else {
        $stmt = $pdo->prepare("INSERT INTO agents (name, email, password) VALUES (?, ?, ?)");
        $stmt->execute([$nome, $email, $senha_hash]);
        echo "Usuário administrador criado com sucesso!\n";
    }
} catch (PDOException $e) {
    echo "Erro: " . $e->getMessage();
}
