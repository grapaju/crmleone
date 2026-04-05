param(
    [string]$DbName = 'crm_imoveis',
    [string]$DbHost = 'localhost',
    [int]$DbPort = 5432,
    [string]$DbUser = 'postgres',
    [string]$SchemaFile = 'database/schema.postgresql.sql',
    [switch]$LoadSmtpSeed
)

$ErrorActionPreference = 'Stop'

function Invoke-Psql {
    param(
        [string[]]$PsqlArgs
    )

    & psql @PsqlArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao executar psql com argumentos: $($PsqlArgs -join ' ')"
    }
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'psql nao encontrado no PATH. Instale PostgreSQL client/server e tente novamente.'
}

$schemaPath = Join-Path (Get-Location) $SchemaFile
if (-not (Test-Path $schemaPath)) {
    throw "Schema nao encontrado: $schemaPath"
}

$seedPath = Join-Path (Get-Location) 'api/php-api-crm/sql/set_smtp_from.sql'

$setPasswordTemporarily = $false
if (-not $env:PGPASSWORD) {
    $securePassword = Read-Host "Senha do usuario PostgreSQL '$DbUser'" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
        $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        $setPasswordTemporarily = $true
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

try {
    $escapedDbName = $DbName.Replace("'", "''")
    $exists = & psql -h $DbHost -p $DbPort -U $DbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$escapedDbName'"
    if ($LASTEXITCODE -ne 0) {
        throw 'Nao foi possivel verificar existencia do banco no postgres.'
    }

    if (($exists | Out-String).Trim() -ne '1') {
        Write-Host "Criando banco '$DbName'..."
        Invoke-Psql -PsqlArgs @('-h', $DbHost, '-p', $DbPort, '-U', $DbUser, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', "CREATE DATABASE `"$DbName`";")
    }
    else {
        Write-Host "Banco '$DbName' ja existe."
    }

    Write-Host 'Aplicando schema PostgreSQL...'
    Invoke-Psql -PsqlArgs @('-h', $DbHost, '-p', $DbPort, '-U', $DbUser, '-d', $DbName, '-v', 'ON_ERROR_STOP=1', '-f', $schemaPath)

    if ($LoadSmtpSeed -and (Test-Path $seedPath)) {
        Write-Host 'Aplicando seed smtp_from...'
        Invoke-Psql -PsqlArgs @('-h', $DbHost, '-p', $DbPort, '-U', $DbUser, '-d', $DbName, '-v', 'ON_ERROR_STOP=1', '-f', $seedPath)
    }

    Write-Host 'Setup PostgreSQL local concluido com sucesso.'
}
finally {
    if ($setPasswordTemporarily) {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}
