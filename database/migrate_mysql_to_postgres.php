<?php

declare(strict_types=1);

function out(string $message): void
{
    echo $message . PHP_EOL;
}

function pgQuoteIdent(string $identifier): string
{
    return '"' . str_replace('"', '""', $identifier) . '"';
}

function mysqlQuoteIdent(string $identifier): string
{
    return '`' . str_replace('`', '``', $identifier) . '`';
}

function normalizeValue(mixed $value, array $targetMeta): mixed
{
    $type = strtolower(trim((string) ($targetMeta['dataType'] ?? 'text')));
    $udt = strtolower(trim((string) ($targetMeta['udtName'] ?? '')));
    $isNullable = strtoupper((string) ($targetMeta['isNullable'] ?? 'YES')) === 'YES';

    $isBoolean = ($type === 'boolean' || $udt === 'bool' || $type === 'bit');
    $isInteger = in_array($type, ['smallint', 'integer', 'bigint'], true) || in_array($udt, ['int2', 'int4', 'int8'], true);
    $isNumeric = in_array($type, ['numeric', 'real', 'double precision', 'decimal'], true) || in_array($udt, ['numeric', 'float4', 'float8'], true);
    $isDateTime = str_contains($type, 'timestamp') || $type === 'date' || $type === 'time' || in_array($udt, ['date', 'timestamp', 'timestamptz', 'time'], true);

    if ($value === null) {
        return null;
    }

    if (is_string($value)) {
        $trimmed = trim($value);
        if ($trimmed === '') {
            if ($isBoolean || $isInteger || $isNumeric || $isDateTime) {
                return null;
            }
            return $isNullable ? null : '';
        }
        if ($trimmed === '0000-00-00' || str_starts_with($trimmed, '0000-00-00')) {
            return null;
        }
    }

    if ($isBoolean) {
        return in_array(strtolower((string) $value), ['1', 't', 'true', 'yes', 'y'], true);
    }

    return match ($type) {
        'smallint', 'integer', 'bigint' => (int) $value,
        'numeric', 'real', 'double precision' => is_string($value) ? str_replace(',', '.', $value) : $value,
        default => $value,
    };
}

$options = getopt('', [
    'source-host::',
    'source-port::',
    'source-db::',
    'source-user::',
    'source-pass::',
    'target-host::',
    'target-port::',
    'target-db::',
    'target-user::',
    'target-pass::',
    'truncate',
    'dry-run',
]);

$cfg = [
    'sourceHost' => $options['source-host'] ?? '127.0.0.1',
    'sourcePort' => (int) ($options['source-port'] ?? '3306'),
    'sourceDb' => $options['source-db'] ?? 'crm_imoveis',
    'sourceUser' => $options['source-user'] ?? 'root',
    'sourcePass' => $options['source-pass'] ?? '',
    'targetHost' => $options['target-host'] ?? '127.0.0.1',
    'targetPort' => (int) ($options['target-port'] ?? '5432'),
    'targetDb' => $options['target-db'] ?? 'crm_imoveis',
    'targetUser' => $options['target-user'] ?? 'postgres',
    'targetPass' => $options['target-pass'] ?? (getenv('DB_PASSWORD') ?: ''),
    'truncate' => array_key_exists('truncate', $options),
    'dryRun' => array_key_exists('dry-run', $options),
];

$columnMappings = [
    'cub' => [
        'valorAtual' => 'valoratual',
    ],
    'documents' => [
        'expiryDate' => 'expirydate',
    ],
];

try {
    $mysqlDsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $cfg['sourceHost'], $cfg['sourcePort'], $cfg['sourceDb']);
    $src = new PDO($mysqlDsn, $cfg['sourceUser'], $cfg['sourcePass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $pgDsn = sprintf('pgsql:host=%s;port=%d;dbname=%s', $cfg['targetHost'], $cfg['targetPort'], $cfg['targetDb']);
    $dst = new PDO($pgDsn, $cfg['targetUser'], $cfg['targetPass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erro conectando aos bancos: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

out('Fonte MySQL: ' . $cfg['sourceHost'] . ':' . $cfg['sourcePort'] . '/' . $cfg['sourceDb']);
out('Destino PostgreSQL: ' . $cfg['targetHost'] . ':' . $cfg['targetPort'] . '/' . $cfg['targetDb']);
out('Modo: ' . ($cfg['dryRun'] ? 'dry-run (sem escrita)' : 'escrita') . ($cfg['truncate'] ? ' com truncate' : ' sem truncate'));

$srcTables = [];
$srcTableStmt = $src->query('SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()');
foreach ($srcTableStmt->fetchAll(PDO::FETCH_COLUMN) as $t) {
    $srcTables[(string) $t] = true;
}

$dstTables = [];
$dstTableStmt = $dst->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name");
foreach ($dstTableStmt->fetchAll(PDO::FETCH_COLUMN) as $t) {
    $dstTables[] = (string) $t;
}

if (empty($dstTables)) {
    out('Nenhuma tabela encontrada no PostgreSQL.');
    exit(1);
}

$migratableTables = [];
foreach ($dstTables as $table) {
    if (isset($srcTables[$table])) {
        $migratableTables[] = $table;
    }
}

if (empty($migratableTables)) {
    out('Nenhuma tabela em comum entre origem e destino.');
    exit(1);
}

if (!$cfg['dryRun'] && $cfg['truncate']) {
    $quoted = implode(', ', array_map('pgQuoteIdent', $migratableTables));
    out('Limpando tabelas de destino (TRUNCATE ... CASCADE)...');
    $dst->exec('SET session_replication_role = replica');
    $dst->exec('TRUNCATE TABLE ' . $quoted . ' RESTART IDENTITY CASCADE');
}

$summary = [];

foreach ($migratableTables as $table) {
    $srcColStmt = $src->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION');
    $srcColStmt->execute([$table]);
    $sourceColumns = $srcColStmt->fetchAll(PDO::FETCH_COLUMN);

    $dstColStmt = $dst->prepare("SELECT column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :table ORDER BY ordinal_position");
    $dstColStmt->execute([':table' => $table]);
    $targetMeta = $dstColStmt->fetchAll(PDO::FETCH_ASSOC);

    $sourceLookup = [];
    foreach ($sourceColumns as $srcCol) {
        $sourceLookup[strtolower((string) $srcCol)] = (string) $srcCol;
    }

    $pairs = []; // target => source
    $targetColumnMeta = [];

    foreach ($targetMeta as $meta) {
        $targetCol = (string) $meta['column_name'];
        $targetColumnMeta[$targetCol] = [
            'dataType' => (string) ($meta['data_type'] ?? 'text'),
            'udtName' => (string) ($meta['udt_name'] ?? ''),
            'isNullable' => (string) ($meta['is_nullable'] ?? 'YES'),
        ];

        $mappedSource = null;
        if (isset($columnMappings[$table])) {
            foreach ($columnMappings[$table] as $srcCol => $dstCol) {
                if ($dstCol === $targetCol) {
                    $mappedSource = $srcCol;
                    break;
                }
            }
        }

        if ($mappedSource === null && isset($sourceLookup[strtolower($targetCol)])) {
            $mappedSource = $sourceLookup[strtolower($targetCol)];
        }

        if ($mappedSource !== null) {
            $pairs[$targetCol] = $mappedSource;
        }
    }

    if (empty($pairs)) {
        out(sprintf('[%s] sem colunas compativeis, pulando.', $table));
        continue;
    }

    $countStmt = $src->query('SELECT COUNT(*) FROM ' . mysqlQuoteIdent($table));
    $sourceCount = (int) $countStmt->fetchColumn();

    out(sprintf('[%s] origem=%d colunas=%d', $table, $sourceCount, count($pairs)));

    if ($cfg['dryRun']) {
        $summary[] = ['table' => $table, 'migrated' => 0, 'source' => $sourceCount, 'mode' => 'dry-run'];
        continue;
    }

    $targetCols = array_keys($pairs);
    $sourceCols = array_values($pairs);

    $selectSql = 'SELECT ' . implode(', ', array_map('mysqlQuoteIdent', $sourceCols)) . ' FROM ' . mysqlQuoteIdent($table);
    $readStmt = $src->query($selectSql);

    $insertColsSql = implode(', ', array_map('pgQuoteIdent', $targetCols));
    $placeholders = implode(', ', array_fill(0, count($targetCols), '?'));
    $insertSql = 'INSERT INTO ' . pgQuoteIdent($table) . ' (' . $insertColsSql . ') VALUES (' . $placeholders . ')';
    $writeStmt = $dst->prepare($insertSql);

    $migrated = 0;
    $unitTypePositionsSeen = [];
    while ($row = $readStmt->fetch(PDO::FETCH_ASSOC)) {
        $values = [];
        foreach ($pairs as $targetCol => $sourceCol) {
            if ($table === 'property_images' && $targetCol === 'is_primary') {
                $raw = $row[$sourceCol] ?? null;
                if ($raw === null || $raw === '' || $raw === ' ') {
                    $values[] = null;
                } else {
                    $values[] = ((int) $raw) === 1;
                }
                continue;
            }
            $values[] = normalizeValue($row[$sourceCol] ?? null, $targetColumnMeta[$targetCol] ?? []);
        }

        // Final guard for boolean columns regardless of source formatting quirks.
        foreach ($targetCols as $idx => $colName) {
            $meta = $targetColumnMeta[$colName] ?? null;
            if (!is_array($meta)) {
                continue;
            }
            $type = strtolower(trim((string) ($meta['dataType'] ?? '')));
            $udt = strtolower(trim((string) ($meta['udtName'] ?? '')));
            $isBoolean = ($type === 'boolean' || $udt === 'bool' || $type === 'bit');
            if (!$isBoolean) {
                continue;
            }

            $current = $values[$idx] ?? null;
            if ($current === '' || $current === ' ') {
                $values[$idx] = null;
                continue;
            }
            if (is_string($current)) {
                $values[$idx] = in_array(strtolower(trim($current)), ['1', 't', 'true', 'yes', 'y'], true);
                continue;
            }
            if (is_int($current) || is_float($current)) {
                $values[$idx] = ((int) $current) === 1;
            }
        }

        // MySQL source can have duplicated unit_types.position while PostgreSQL enforces uniqueness.
        if ($table === 'unit_types') {
            $positionIdx = array_search('position', $targetCols, true);
            if ($positionIdx !== false) {
                $rawPos = (string) ($values[$positionIdx] ?? '');
                $normalized = strtolower(trim($rawPos));
                if ($normalized !== '') {
                    if (isset($unitTypePositionsSeen[$normalized])) {
                        $suffix = 2;
                        $newPos = $rawPos . '_dup_' . $suffix;
                        while (isset($unitTypePositionsSeen[strtolower($newPos)])) {
                            $suffix++;
                            $newPos = $rawPos . '_dup_' . $suffix;
                        }
                        $values[$positionIdx] = $newPos;
                        $normalized = strtolower($newPos);
                    }
                    $unitTypePositionsSeen[$normalized] = true;
                }
            }
        }

        try {
            foreach ($values as $idx => $paramValue) {
                $paramPos = $idx + 1;
                $colName = $targetCols[$idx] ?? '';
                $meta = $targetColumnMeta[$colName] ?? null;
                $type = strtolower(trim((string) (($meta['dataType'] ?? ''))));
                $udt = strtolower(trim((string) (($meta['udtName'] ?? ''))));
                $isBoolean = ($type === 'boolean' || $udt === 'bool' || $type === 'bit');
                $isInteger = in_array($type, ['smallint', 'integer', 'bigint'], true) || in_array($udt, ['int2', 'int4', 'int8'], true);

                if ($paramValue === null) {
                    $writeStmt->bindValue($paramPos, null, PDO::PARAM_NULL);
                } elseif ($isBoolean) {
                    $writeStmt->bindValue($paramPos, (bool) $paramValue, PDO::PARAM_BOOL);
                } elseif ($isInteger) {
                    $writeStmt->bindValue($paramPos, (int) $paramValue, PDO::PARAM_INT);
                } else {
                    $writeStmt->bindValue($paramPos, (string) $paramValue, PDO::PARAM_STR);
                }
            }

            $writeStmt->execute();
        } catch (Throwable $e) {
            $debug = '';
            if ($table === 'property_images' && isset($values[5])) {
                $debug = ' [debug is_primary=' . var_export($values[5], true) . ']';
            }
            throw new RuntimeException(sprintf('Falha inserindo na tabela %s (colunas: %s): %s%s', $table, implode(', ', $targetCols), $e->getMessage(), $debug), 0, $e);
        }
        $migrated += (int) $writeStmt->rowCount();
    }

    // Ajusta sequence de PK id quando existir serial/identity.
    $idExists = false;
    foreach ($targetCols as $c) {
        if ($c === 'id') {
            $idExists = true;
            break;
        }
    }
    if ($idExists) {
        $seqStmt = $dst->query("SELECT pg_get_serial_sequence('public.$table', 'id')");
        $seqName = $seqStmt->fetchColumn();
        if (is_string($seqName) && $seqName !== '') {
            $dst->exec("SELECT setval('" . str_replace("'", "''", $seqName) . "', COALESCE((SELECT MAX(id) FROM " . pgQuoteIdent($table) . "), 1), (SELECT COUNT(*) > 0 FROM " . pgQuoteIdent($table) . "))");
        }
    }

    $summary[] = ['table' => $table, 'migrated' => $migrated, 'source' => $sourceCount, 'mode' => 'write'];
}

if (!$cfg['dryRun'] && $cfg['truncate']) {
    $dst->exec('SET session_replication_role = DEFAULT');
}

out('--- Resumo ---');
$totalMigrated = 0;
foreach ($summary as $item) {
    out(sprintf('%s: origem=%d migradas=%d (%s)', $item['table'], $item['source'], $item['migrated'], $item['mode']));
    $totalMigrated += $item['migrated'];
}
out('Total de linhas migradas: ' . $totalMigrated);
