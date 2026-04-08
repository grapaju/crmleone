<?php
require_once '../src/config/database.php';

try {
    $pdo = getDatabaseConnection();

    $nome = "Administrador";
    $email = "admin@imovelcrm.com";
    $senha = "admin123"; // Você pode alterar para uma senha mais segura
    $senha_hash = password_hash($senha, PASSWORD_DEFAULT);

    // Verifica se já existe o usuário e corrige role/status legados quando necessário.
    $stmt = $pdo->prepare("SELECT id, role, status FROM agents WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $needsRole = !isset($existing['role']) || trim((string) $existing['role']) === '';
        $needsStatus = !isset($existing['status']) || trim((string) $existing['status']) === '';

        if ($needsRole || $needsStatus) {
            $update = $pdo->prepare("UPDATE agents SET role = COALESCE(NULLIF(role, ''), 'admin'), status = COALESCE(NULLIF(status, ''), 'Ativo') WHERE id = ?");
            $update->execute([$existing['id']]);
            echo "Usuário já cadastrado. Role/status corrigidos para compatibilidade.\n";
        } else {
            echo "Usuário já cadastrado.\n";
        }
    } else {
        $stmt = $pdo->prepare("INSERT INTO agents (name, email, password, status, role) VALUES (?, ?, ?, 'Ativo', 'admin')");
        $stmt->execute([$nome, $email, $senha_hash]);
        echo "Usuário administrador criado com sucesso!\n";
    }
} catch (PDOException $e) {
    echo "Erro: " . $e->getMessage();
}
