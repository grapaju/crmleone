<?php
// find_orphans.php
require_once __DIR__ . '/../src/config/database.php';

$uploadsDir = __DIR__ . '/../uploads';
if (!is_dir($uploadsDir)) {
    echo "Pasta uploads não encontrada em: $uploadsDir\n";
    exit(1);
}

try {
    $pdo = getDatabaseConnection();
} catch (Exception $e) {
    echo "Erro conectando ao DB: " . $e->getMessage() . "\n";
    exit(1);
}

// Pega lista de file_path do DB e normaliza (remove 'uploads/' prefixo)
$stmt = $pdo->query("SELECT file_path FROM documents");
$dbFiles = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $p = $row['file_path'] ?? '';
    $p = preg_replace('#^uploads/#i', '', $p);
    if ($p !== '') $dbFiles[strtolower($p)] = true;
}

// Lista arquivos no disco
$diskFiles = [];
$it = new DirectoryIterator($uploadsDir);
foreach ($it as $file) {
    if ($file->isFile()) {
        $diskFiles[$file->getFilename()] = [
            'size' => $file->getSize(),
            'mtime' => date('Y-m-d H:i:s', $file->getMTime())
        ];
    }
}

// Calcula órfãos = arquivos no disco não referenciados no DB
$orphans = [];
foreach ($diskFiles as $name => $meta) {
    if (!isset($dbFiles[strtolower($name)])) $orphans[$name] = $meta;
}

// Saída legível (CLI ou browser)
echo "=== Arquivos no DB (file_path -> sem prefixo 'uploads/') ===\n";
foreach (array_keys($dbFiles) as $f) echo $f . PHP_EOL;

echo "\n=== Arquivos no disco (uploads) ===\n";
foreach ($diskFiles as $n => $m) echo sprintf("%-40s %8d bytes  %s\n", $n, $m['size'], $m['mtime']);

echo "\n=== Arquivos órfãos (no disco e NÃO no DB) ===\n";
if (empty($orphans)) {
    echo "(nenhum)\n";
} else {
    foreach ($orphans as $n => $m) echo sprintf("%-40s %8d bytes  %s\n", $n, $m['size'], $m['mtime']);
}

echo "\nNota: isto NÃO modifica nada. Cole a saída aqui para eu recomendar ações seguras (backup/mover/remover).\n";
