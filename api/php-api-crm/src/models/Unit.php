<?php
class Unit
{
    private $pdo;
    private $table;
    private $cols;
    private $availableColumns; // cache de colunas reais da tabela

    public function __construct($db)
    {
        $this->pdo = $db;
        $this->table = 'unidades';
        $this->cols = [
            'project' => 'obra_id',
            'tower' => 'torre_id',
            'number' => 'numero_unidade',
            'floor' => 'pavimento',
            'type' => 'tipo',
            'area_private' => 'area_privativa',
            'area_total' => 'area_total',
            'status' => 'status_venda',
            'price' => 'valor',
            'features' => 'caracteristicas_especificas',
        ];

        $this->availableColumns = [];

        try {
            $stmt = $this->pdo->prepare("SELECT table_name FROM information_schema.tables WHERE table_name IN ('unidades','units')");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (in_array('units', $rows)) {
                $this->table = 'units';
                // adjust mapping to english
                $this->cols['project'] = 'project_id';
                $this->cols['tower'] = 'tower_id';
                $this->cols['number'] = 'unit_number';
                $this->cols['floor'] = 'floor';
                $this->cols['type'] = 'type';
                $this->cols['area_private'] = 'area_private';
                $this->cols['area_total'] = 'area_total';
                $this->cols['status'] = 'sale_status';
                $this->cols['price'] = 'price';
                $this->cols['features'] = 'specific_features';
            } elseif (in_array('unidades', $rows)) {
                $this->table = 'unidades';
            } else {
                // no units table found in database
                $this->table = null;
            }
        } catch (PDOException $e) {
            $this->table = 'unidades';
        }

        // Detect real existing columns to build dynamic queries
        try {
            if ($this->table) {
                $stmt = $this->pdo->prepare("SELECT column_name FROM information_schema.columns WHERE table_name = ?");
                $stmt->execute([$this->table]);
                $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
                if (is_array($rows)) {
                    $this->availableColumns = array_flip($rows);
                }
            }
        } catch (Throwable $e) {
            $this->availableColumns = [];
        }
    }

    private function col($logical)
    {
        return $this->cols[$logical] ?? $logical;
    }

    public function getAll()
    {
        if (!$this->table) return [];
        $stmt = $this->pdo->query("SELECT * FROM {$this->table}");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id)
    {
        if (!$this->table) return null;
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getByProject($projectId)
    {
        if (!$this->table) return [];
        $projCol = $this->col('project');
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE {$projCol} = ?");
        $stmt->execute([$projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create($data)
    {
        if (!$this->table) {
            throw new Exception('Units table not found in database');
        }
        // Map logical values
        $mapped = [
            $this->col('project') => $data['obra_id'] ?? $data['project_id'] ?? $data['projectId'] ?? null,
            $this->col('tower') => $data['torre_id'] ?? $data['tower_id'] ?? $data['towerId'] ?? null,
            $this->col('number') => $data['numero_unidade'] ?? $data['unit_number'] ?? null,
            $this->col('floor') => $data['pavimento'] ?? $data['floor'] ?? null,
            $this->col('type') => $data['tipo'] ?? $data['type'] ?? null,
            $this->col('area_private') => $data['area_privativa'] ?? $data['area_private'] ?? null,
            $this->col('area_total') => $data['area_total'] ?? ($data['area_privativa'] ?? $data['area_private'] ?? null),
            $this->col('status') => $data['status_venda'] ?? $data['sale_status'] ?? null,
            $this->col('price') => $data['valor'] ?? $data['price'] ?? null,
            $this->col('features') => $data['caracteristicas_especificas'] ?? $data['specific_features'] ?? null,
        ];

        // Campos adicionais (CUB)
        if (isset($this->availableColumns['cub_referencia'])) {
            $mapped['cub_referencia'] = $data['cubReferencia'] ?? null;
        }
        if (isset($this->availableColumns['id_cub_atual'])) {
            $mapped['id_cub_atual'] = $data['id_cubAtual'] ?? null;
        }
        if (isset($this->availableColumns['valor_atualizado'])) {
            $mapped['valor_atualizado'] = $data['valor_atualizado'] ?? null;
        }
        // unit_type_id (nova relação)
        if (isset($this->availableColumns['unit_type_id'])) {
            $mapped['unit_type_id'] = $data['unit_type_id'] ?? $data['unitTypeId'] ?? null;
        }
        // Floor factor
        if (isset($this->availableColumns['floor_factor'])) {
            $mapped['floor_factor'] = $data['floor_factor'] ?? $data['floorFactor'] ?? null;
        }
        // Dormitórios / Vagas (tabela PT) ou bedrooms / parking (tabela EN)
        if (isset($this->availableColumns['dormitorios'])) {
            $mapped['dormitorios'] = $data['dormitorios'] ?? $data['bedrooms'] ?? null;
        } elseif (isset($this->availableColumns['bedrooms'])) {
            $mapped['bedrooms'] = $data['bedrooms'] ?? $data['dormitorios'] ?? null;
        }
        if (isset($this->availableColumns['vagas'])) {
            $mapped['vagas'] = $data['vagas'] ?? $data['parking'] ?? null;
        } elseif (isset($this->availableColumns['parking'])) {
            $mapped['parking'] = $data['parking'] ?? $data['vagas'] ?? null;
        }

        // Filtra somente colunas realmente existentes
        $filtered = [];
        foreach ($mapped as $col => $val) {
            if (isset($this->availableColumns[$col])) {
                $filtered[$col] = $val;
            }
        }

        $columns = array_keys($filtered);
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $colList = implode(', ', $columns);
        $sql = "INSERT INTO {$this->table} ($colList) VALUES ($placeholders)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_values($filtered));
        return $this->pdo->lastInsertId();
    }

    public function update($id, $data)
    {
        if (!$this->table) {
            throw new Exception('Units table not found in database');
        }
        $mapped = [
            $this->col('tower') => $data['torre_id'] ?? $data['tower_id'] ?? null,
            $this->col('number') => $data['numero_unidade'] ?? $data['unit_number'] ?? null,
            $this->col('floor') => $data['pavimento'] ?? $data['floor'] ?? null,
            $this->col('type') => $data['tipo'] ?? $data['type'] ?? null,
            $this->col('area_private') => $data['area_privativa'] ?? $data['area_private'] ?? null,
            $this->col('area_total') => $data['area_total'] ?? ($data['area_privativa'] ?? $data['area_private'] ?? null),
            $this->col('status') => $data['status_venda'] ?? $data['sale_status'] ?? null,
            $this->col('price') => $data['valor'] ?? $data['price'] ?? null,
            $this->col('features') => $data['caracteristicas_especificas'] ?? $data['specific_features'] ?? null,
        ];
        if (isset($this->availableColumns['cub_referencia'])) {
            $mapped['cub_referencia'] = $data['cubReferencia'] ?? null;
        }
        if (isset($this->availableColumns['id_cub_atual'])) {
            $mapped['id_cub_atual'] = $data['id_cubAtual'] ?? null;
        }
        if (isset($this->availableColumns['valor_atualizado'])) {
            $mapped['valor_atualizado'] = $data['valor_atualizado'] ?? null;
        }
        if (isset($this->availableColumns['unit_type_id'])) {
            $mapped['unit_type_id'] = $data['unit_type_id'] ?? $data['unitTypeId'] ?? null;
        }
        if (isset($this->availableColumns['floor_factor'])) {
            $mapped['floor_factor'] = $data['floor_factor'] ?? $data['floorFactor'] ?? null;
        }
        if (isset($this->availableColumns['dormitorios'])) {
            $mapped['dormitorios'] = $data['dormitorios'] ?? $data['bedrooms'] ?? null;
        } elseif (isset($this->availableColumns['bedrooms'])) {
            $mapped['bedrooms'] = $data['bedrooms'] ?? $data['dormitorios'] ?? null;
        }
        if (isset($this->availableColumns['vagas'])) {
            $mapped['vagas'] = $data['vagas'] ?? $data['parking'] ?? null;
        } elseif (isset($this->availableColumns['parking'])) {
            $mapped['parking'] = $data['parking'] ?? $data['vagas'] ?? null;
        }
        $sets = [];
        $values = [];
        foreach ($mapped as $col => $val) {
            if (isset($this->availableColumns[$col])) {
                $sets[] = "$col = ?";
                $values[] = $val;
            }
        }
        if (!$sets) return false;
        $values[] = $id;
        $sql = "UPDATE {$this->table} SET " . implode(', ', $sets) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($values);
    }

    public function delete($id)
    {
        if (!$this->table) {
            throw new Exception('Units table not found in database');
        }
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE id = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Recalcula valor_atualizado das unidades usando o CUB vigente mais recente.
     * Lógica:
     * - Busca último registro em tabela `cub` ordenado por vigencia desc (ou id desc se vigencia ausente)
     * - Se existir coluna cub_referencia e id_cub_atual, atualiza essas colunas
     * - Computa valor_atualizado = area_privativa * cub.valorAtual (quando area_privativa presente)
     */
    public function recomputeCub($towerId = null)
    {
        if (!$this->table) {
            throw new Exception('Units table not found in database');
        }
        try {
            $debug = isset($_GET['debug']);
            // verificar tabela cub
            $cubRow = null;
            try {
                $q = $this->pdo->query("SELECT * FROM cub ORDER BY vigencia DESC, id DESC LIMIT 1");
                $cubRow = $q->fetch(PDO::FETCH_ASSOC);
            } catch (Throwable $e) {
                // sem tabela cub -> nada a fazer
                return ['updated' => 0, 'message' => 'Tabela cub não encontrada'];
            }
            if (!$cubRow) {
                return ['updated' => 0, 'message' => 'Nenhum registro CUB encontrado'];
            }
            $valorAtualRaw = $cubRow['valorAtual'] ?? $cubRow['valoratual'] ?? $cubRow['valor_atual'] ?? null;
            $valorAtual = $valorAtualRaw !== null ? (float)$valorAtualRaw : null;
            $cubId = $cubRow['id'] ?? null;
            if (!$valorAtual) {
                return ['updated' => 0, 'message' => 'Registro CUB sem valorAtual'];
            }

            // checar colunas necessárias
            $hasCubRef = isset($this->availableColumns['cub_referencia']);
            $hasIdCubAtual = isset($this->availableColumns['id_cub_atual']);
            $hasValorAtualizado = isset($this->availableColumns['valor_atualizado']);
            $areaCol = $this->col('area_private');

            // se não tem nenhuma coluna de destino além da area, aborta
            if (!$hasCubRef && !$hasIdCubAtual && !$hasValorAtualizado) {
                return ['updated' => 0, 'message' => 'Colunas CUB não presentes'];
            }

            // Backfill de floor_factor se existir coluna e valores ainda NULL
            if (isset($this->availableColumns['floor_factor'])) {
                // Definir fatores conforme regra (6..17) limites; <6 usa 3.81; >17 usa 5.72
                $towerFilterSqlBF = $towerId ? " AND {$this->col('tower')} = :towerFilterBF" : '';
                $sqlBF = "UPDATE {$this->table} SET floor_factor = CASE 
                    WHEN floor IS NOT NULL THEN (
                        CASE 
                           WHEN floor < 6 THEN 3.81
                           WHEN floor = 6 THEN 3.81
                           WHEN floor = 7 THEN 3.90
                           WHEN floor = 8 THEN 4.00
                           WHEN floor = 9 THEN 4.17
                           WHEN floor = 10 THEN 4.35
                           WHEN floor = 11 THEN 4.53
                           WHEN floor = 12 THEN 4.73
                           WHEN floor = 13 THEN 4.93
                           WHEN floor = 14 THEN 5.09
                           WHEN floor = 15 THEN 5.30
                           WHEN floor = 16 THEN 5.52
                           WHEN floor >= 17 THEN 5.72
                           ELSE 1
                        END
                    ) ELSE floor_factor END
                    WHERE (floor_factor IS NULL OR floor_factor=0) $towerFilterSqlBF";
                $stmtBF = $this->pdo->prepare($sqlBF);
                if ($towerId) $stmtBF->bindValue(':towerFilterBF', $towerId);
                try {
                    $stmtBF->execute();
                } catch (Throwable $e) { /* ignore */
                }
            }

            // Nova fórmula: valor_atualizado = area_privativa * CUB_ATUAL * floor_factor
            // Fallbacks:
            // - se floor_factor não existir: usa 1
            // - se area_privativa null: mantém valor_atualizado
            $priceCol = $this->col('price'); // pode permanecer para auditoria futura se quisermos
            $sets = [];
            if ($hasCubRef) $sets[] = "cub_referencia = :cubRef"; // atualizar referência para o novo CUB
            if ($hasIdCubAtual) $sets[] = "id_cub_atual = :idCub";
            if ($hasValorAtualizado) {
                if (isset($this->availableColumns['floor_factor'])) {
                    $sets[] = "valor_atualizado = CASE 
                        WHEN (area_privativa IS NOT NULL AND :cubRef > 0) THEN (area_privativa * :cubRef * COALESCE(floor_factor,1))
                        ELSE valor_atualizado END";
                } else {
                    $sets[] = "valor_atualizado = CASE 
                        WHEN (area_privativa IS NOT NULL AND :cubRef > 0) THEN (area_privativa * :cubRef) 
                        ELSE valor_atualizado END";
                }
            }
            // se coluna atualizado_em existir, atualizar timestamp
            if (isset($this->availableColumns['atualizado_em'])) {
                $sets[] = "atualizado_em = NOW()";
            }
            if (!$sets) {
                return ['updated' => 0, 'message' => 'Nada para atualizar'];
            }
            // Registrar histórico antes do update se tabela unit_cub_history existir
            $historyExists = false;
            try {
                $chk = $this->pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'unit_cub_history'");
                $chk->execute();
                $historyExists = ((int)$chk->fetchColumn()) > 0;
            } catch (Throwable $e) { /* ignore */
            }

            if ($historyExists) {
                $towerClause = $towerId ? " AND {$this->col('tower')} = :towerFilter" : '';
                if (isset($this->availableColumns['floor_factor'])) {
                    $historyInsert = "INSERT INTO unit_cub_history (unit_id, cub_id, cub_valor, old_cub_referencia, old_id_cub_atual, old_valor_atualizado, new_cub_referencia, new_id_cub_atual, new_valor_atualizado)
                        SELECT id as unit_id, :cubId as cub_id, :cubVal as cub_valor,
                            COALESCE(cub_referencia, NULL) as old_cub_referencia,
                            COALESCE(id_cub_atual, NULL) as old_id_cub_atual,
                            COALESCE(valor_atualizado, NULL) as old_valor_atualizado,
                            :cubVal as new_cub_referencia,
                            :cubId as new_id_cub_atual,
                            CASE 
                               WHEN (area_privativa IS NOT NULL AND :cubVal > 0) THEN (area_privativa * :cubVal * COALESCE(floor_factor,1))
                               ELSE valor_atualizado
                            END as new_valor_atualizado
                        FROM {$this->table} WHERE 1=1 $towerClause";
                } else {
                    $historyInsert = "INSERT INTO unit_cub_history (unit_id, cub_id, cub_valor, old_cub_referencia, old_id_cub_atual, old_valor_atualizado, new_cub_referencia, new_id_cub_atual, new_valor_atualizado)
                        SELECT id as unit_id, :cubId as cub_id, :cubVal as cub_valor,
                            COALESCE(cub_referencia, NULL) as old_cub_referencia,
                            COALESCE(id_cub_atual, NULL) as old_id_cub_atual,
                            COALESCE(valor_atualizado, NULL) as old_valor_atualizado,
                            :cubVal as new_cub_referencia,
                            :cubId as new_id_cub_atual,
                            CASE 
                               WHEN (area_privativa IS NOT NULL AND :cubVal > 0) THEN (area_privativa * :cubVal)
                               ELSE valor_atualizado
                            END as new_valor_atualizado
                        FROM {$this->table} WHERE 1=1 $towerClause";
                }
                $hStmt = $this->pdo->prepare($historyInsert);
                $hStmt->bindValue(':cubId', $cubId);
                $hStmt->bindValue(':cubVal', $valorAtual);
                if ($towerId) $hStmt->bindValue(':towerFilter', $towerId);
                $hStmt->execute();
            }

            $towerFilterSql = $towerId ? " AND {$this->col('tower')} = :towerFilter" : '';
            $sql = "UPDATE {$this->table} SET " . implode(', ', $sets) . " WHERE 1=1 $towerFilterSql";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':cubRef', $valorAtual);
            if ($hasIdCubAtual) $stmt->bindValue(':idCub', $cubId);
            if ($towerId) $stmt->bindValue(':towerFilter', $towerId);
            $stmt->execute();
            $count = $stmt->rowCount();
            $resp = ['updated' => $count, 'cubValor' => $valorAtual, 'cubId' => $cubId];
            if ($debug) {
                // incluir algumas amostras para depuração
                try {
                    $towerClauseDbg = $towerId ? " AND {$this->col('tower')} = :towerFilterDBG" : '';
                    $dbgSql = "SELECT id, {$this->col('floor')} AS floor_num, area_privativa, floor_factor, valor_atualizado FROM {$this->table} WHERE area_privativa IS NOT NULL $towerClauseDbg ORDER BY id DESC LIMIT 5";
                    $dbgStmt = $this->pdo->prepare($dbgSql);
                    if ($towerId) $dbgStmt->bindValue(':towerFilterDBG', $towerId);
                    $dbgStmt->execute();
                    $resp['debug_samples'] = $dbgStmt->fetchAll(PDO::FETCH_ASSOC);
                    $resp['columns'] = array_keys($this->availableColumns);
                } catch (Throwable $e) {
                    $resp['debug_error'] = $e->getMessage();
                }
            }
            if ($historyExists) {
                $resp['history'] = 'registered';
            }
            return $resp;
        } catch (Throwable $e) {
            return ['error' => $e->getMessage()];
        }
    }
}
