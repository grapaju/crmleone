-- Migration 012: Ajustes na tabela CUB (MySQL)
-- Objetivo: garantir colunas de auditoria e unicidade por vigência.
-- ATENÇÃO: Comente as linhas que já tiverem sido aplicadas para evitar erros de "Duplicate column" ou "Duplicate key".

-- 1) Adicionar coluna criado_em (se ainda não existir)
ALTER TABLE cub ADD COLUMN criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER variacao;

-- 2) Adicionar coluna atualizado_em (se ainda não existir)
ALTER TABLE cub ADD COLUMN atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER criado_em;

-- 3) Índice único por vigência (um registro por mês)
ALTER TABLE cub ADD UNIQUE KEY uk_cub_vigencia (vigencia);

-- 4) Índice auxiliar para ordenação
ALTER TABLE cub ADD INDEX idx_cub_vigencia_desc (vigencia);

-- Caso alguma instrução acima falhe por já existir, comente-a e reexecute as demais.
-- Para verificar estrutura atual: SHOW CREATE TABLE cub; ou DESCRIBE cub; 
