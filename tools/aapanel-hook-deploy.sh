#!/usr/bin/env bash

set -euo pipefail

echo "$(date)"
cd /www/wwwroot/crmleone
bash tools/deploy-aapanel-git.sh
echo "🚀 Application deployed!"
echo ""
