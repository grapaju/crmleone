# Migracao para PostgreSQL

Este projeto foi ajustado no backend PHP para usar PostgreSQL via PDO (`pgsql`).

## Variaveis de ambiente

Configure no servidor:

- `DB_HOST` (ex.: `127.0.0.1`)
- `DB_PORT` (ex.: `5432`)
- `DB_NAME` (ex.: `crm_imoveis`)
- `DB_USER` (ex.: `postgres`)
- `DB_PASSWORD`

## Estrutura do banco

Use o schema nativo PostgreSQL deste projeto:

```bash
psql -h localhost -p 5432 -U postgres -d crm_imoveis -f database/schema.postgresql.sql
```

No Windows (PowerShell), voce pode automatizar criacao do banco + import do schema:

```powershell
powershell -ExecutionPolicy Bypass -File database/setup_postgres_local.ps1 -DbUser postgres -DbName crm_imoveis -LoadSmtpSeed
```

O arquivo `database/schema.sql` original foi gerado para MySQL/MariaDB.
Se voce precisa migrar dados historicos de uma base MySQL existente, use uma das abordagens:

1. Migracao direta com `pgloader` a partir do MySQL existente.
2. Conversao do dump e ajustes manuais de tipos/constraints.

### Exemplo com pgloader

```bash
pgloader mysql://USER:PASS@HOST_MYSQL/crm_imoveis postgresql://USER_PG:PASS_PG@HOST_PG:5432/crm_imoveis
```

## Verificacoes pos-migracao

1. Validar se todas as tabelas usadas pela API existem no PostgreSQL.
2. Validar chaves unicas em tabelas de configuracao (`configuracoes.chave` e/ou `settings.key_name`).
3. Testar endpoints principais: login, leads, properties, projects, units, settings e calendar.
4. Testar upload de documentos e automacoes.

## Migrar dados do MySQL para PostgreSQL (localhost)

O projeto inclui um migrador pronto em `database/migrate_mysql_to_postgres.php`.

### 1) Previa (dry-run, sem escrever no PostgreSQL)

```powershell
php database/migrate_mysql_to_postgres.php --source-host=127.0.0.1 --source-port=3306 --source-db=crm_imoveis --source-user=root --source-pass= --target-host=127.0.0.1 --target-port=5432 --target-db=crm_imoveis --target-user=postgres --target-pass=123 --dry-run
```

### 2) Migracao real (limpando tabelas do PostgreSQL antes de copiar)

```powershell
php database/migrate_mysql_to_postgres.php --source-host=127.0.0.1 --source-port=3306 --source-db=crm_imoveis --source-user=root --source-pass= --target-host=127.0.0.1 --target-port=5432 --target-db=crm_imoveis --target-user=postgres --target-pass=123 --truncate
```

Observacoes:
- `--truncate` apaga os dados atuais do PostgreSQL nas tabelas em comum antes da copia.
- Se o MySQL tiver senha no `root`, ajuste `--source-pass`.
- O migrador faz mapeamentos de colunas com nomes diferentes (ex.: `cub.valorAtual` -> `cub.valoratual`, `documents.expiryDate` -> `documents.expirydate`).
