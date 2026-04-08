#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${BASH_VERSION:-}" ]]; then
  echo "Erro: execute este script com bash, nao com sh."
  echo "Use: bash tools/deploy-aapanel-git.sh"
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

PUBLISH_ROOT="${PUBLISH_ROOT:-${REPO_ROOT}/.deploy/live}"
SHARED_ROOT="${SHARED_ROOT:-${REPO_ROOT}/.deploy/shared}"
WEB_USER="${WEB_USER:-www}"
WEB_GROUP="${WEB_GROUP:-www}"
RUN_NPM_INSTALL="${RUN_NPM_INSTALL:-1}"
RUN_COMPOSER_INSTALL="${RUN_COMPOSER_INSTALL:-1}"
VITE_EMPTY_OUT_DIR="${VITE_EMPTY_OUT_DIR:-false}"

echo "==> Repo root: ${REPO_ROOT}"
echo "==> Publish root: ${PUBLISH_ROOT}"
echo "==> Shared root: ${SHARED_ROOT}"

cd "${REPO_ROOT}"

echo "==> Atualizando codigo"
git pull --ff-only

if [[ "${RUN_NPM_INSTALL}" == "1" ]]; then
  echo "==> Instalando dependencias do frontend"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
fi

echo "==> Gerando build do frontend"

# Em ambientes aaPanel pode existir .user.ini protegido em .deploy/live.
# Com --emptyOutDir=true o Vite tenta limpar o diretorio e pode falhar com ENOTDIR.
if [[ "${VITE_EMPTY_OUT_DIR}" == "true" && -f "${PUBLISH_ROOT}/.user.ini" ]]; then
  echo "==> Aviso: .user.ini detectado em ${PUBLISH_ROOT}; forçando --emptyOutDir=false"
  VITE_EMPTY_OUT_DIR="false"
fi

# Mantem a pasta de publicacao limpa sem apagar arquivos protegidos do aaPanel.
mkdir -p "${PUBLISH_ROOT}"
rm -f "${PUBLISH_ROOT}/index.html"
rm -rf "${PUBLISH_ROOT}/assets"

npm run build -- --outDir .deploy/live --emptyOutDir "${VITE_EMPTY_OUT_DIR}"

if [[ "${RUN_COMPOSER_INSTALL}" == "1" ]]; then
  echo "==> Instalando dependencias PHP"
  composer install --working-dir="${REPO_ROOT}/api/php-api-crm" --no-dev --optimize-autoloader
fi

echo "==> Preparando diretorios de publicacao"
mkdir -p \
  "${PUBLISH_ROOT}" \
  "${PUBLISH_ROOT}/api" \
  "${PUBLISH_ROOT}/src" \
  "${PUBLISH_ROOT}/vendor" \
  "${SHARED_ROOT}/uploads" \
  "${SHARED_ROOT}/logs"

echo "==> Publicando API publica"
rsync -a \
  --delete \
  --exclude 'uploads/' \
  --exclude 'logs/' \
  "${REPO_ROOT}/api/php-api-crm/public/" "${PUBLISH_ROOT}/api/"

echo "==> Publicando codigo PHP"
rsync -a --delete "${REPO_ROOT}/api/php-api-crm/src/" "${PUBLISH_ROOT}/src/"
rsync -a --delete "${REPO_ROOT}/api/php-api-crm/vendor/" "${PUBLISH_ROOT}/vendor/"

echo "==> Ligando diretorios persistentes"
rm -rf "${PUBLISH_ROOT}/api/uploads" "${PUBLISH_ROOT}/api/logs"
ln -sfn "${SHARED_ROOT}/uploads" "${PUBLISH_ROOT}/api/uploads"
ln -sfn "${SHARED_ROOT}/logs" "${PUBLISH_ROOT}/api/logs"

if [[ "$(id -u)" == "0" ]]; then
  echo "==> Ajustando permissoes de uploads e logs"
  chown -R "${WEB_USER}:${WEB_GROUP}" "${SHARED_ROOT}/uploads" "${SHARED_ROOT}/logs"
  chmod -R 775 "${SHARED_ROOT}/uploads" "${SHARED_ROOT}/logs"
else
  echo "==> Sem privilegio root; ajuste permissoes manualmente se necessario"
fi

echo "==> Deploy concluido"
echo "Site: https://leonecrm.psys.tech/"
echo "Publicacao ativa em: ${PUBLISH_ROOT}"

