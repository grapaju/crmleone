#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

SITE_ROOT="${SITE_ROOT:-/www/wwwroot/crmleone}"
WEB_USER="${WEB_USER:-www}"
WEB_GROUP="${WEB_GROUP:-www}"
RUN_NPM_INSTALL="${RUN_NPM_INSTALL:-1}"
RUN_COMPOSER_INSTALL="${RUN_COMPOSER_INSTALL:-1}"

echo "==> Repo root: ${REPO_ROOT}"
echo "==> Site root: ${SITE_ROOT}"

cd "${REPO_ROOT}"

echo "==> Atualizando codigo"
git pull --ff-only

if [[ "${RUN_NPM_INSTALL}" == "1" ]]; then
  echo "==> Instalando dependencias do frontend"
  npm install
fi

echo "==> Gerando build do frontend"
npm run build

if [[ "${RUN_COMPOSER_INSTALL}" == "1" ]]; then
  echo "==> Instalando dependencias PHP"
  composer install --working-dir="${REPO_ROOT}/api/php-api-crm" --no-dev --optimize-autoloader
fi

echo "==> Preparando diretorios do site"
mkdir -p \
  "${SITE_ROOT}" \
  "${SITE_ROOT}/api" \
  "${SITE_ROOT}/api/uploads" \
  "${SITE_ROOT}/api/logs" \
  "${SITE_ROOT}/src" \
  "${SITE_ROOT}/vendor"

echo "==> Publicando frontend"
rsync -a "${REPO_ROOT}/dist/" "${SITE_ROOT}/"

echo "==> Publicando API publica"
rsync -a \
  --exclude 'uploads/' \
  --exclude 'logs/' \
  "${REPO_ROOT}/api/php-api-crm/public/" "${SITE_ROOT}/api/"

echo "==> Publicando codigo PHP"
rsync -a "${REPO_ROOT}/api/php-api-crm/src/" "${SITE_ROOT}/src/"
rsync -a "${REPO_ROOT}/api/php-api-crm/vendor/" "${SITE_ROOT}/vendor/"

if [[ "$(id -u)" == "0" ]]; then
  echo "==> Ajustando permissoes de uploads e logs"
  chown -R "${WEB_USER}:${WEB_GROUP}" "${SITE_ROOT}/api/uploads" "${SITE_ROOT}/api/logs"
  chmod -R 775 "${SITE_ROOT}/api/uploads" "${SITE_ROOT}/api/logs"
else
  echo "==> Sem privilegio root; ajuste permissoes manualmente se necessario"
fi

echo "==> Deploy concluido"
echo "Site: https://leonecrm.psys.tech/"
