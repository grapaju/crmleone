# Deploy Passo a Passo no aaPanel

Este documento descreve o fluxo oficial para publicar este CRM em producao no aaPanel.

Objetivo do deploy:

1. Frontend React/Vite servido como arquivo estatico.
2. API PHP no mesmo dominio via rota /api.
3. Banco PostgreSQL.
4. Uploads e logs persistentes entre deploys.

Importante:

1. Nao use Node Project para este sistema em producao.
2. O fluxo correto e Website Nginx + PHP-FPM + PostgreSQL.

## 1. Pre-requisitos

No servidor, confirme:

1. Nginx instalado pelo aaPanel.
2. PHP 8.2 ou 8.3 com extensoes pdo_pgsql e pgsql.
3. PostgreSQL acessivel.
4. Node 18+ para gerar build.
5. Composer para dependencias da API.
6. Git instalado.

## 2. Estrutura recomendada

Use a estrutura abaixo para evitar conflitos e apagamento acidental:

1. Codigo fonte Git: /www/wwwroot/crmleone
2. Publicacao ativa: /www/wwwroot/crmleone/.deploy/live
3. Dados persistentes: /www/wwwroot/crmleone/.deploy/shared

## 3. Primeiro deploy no servidor

No terminal do servidor:

1. Clonar repositorio

  cd /www/wwwroot
  git clone https://github.com/grapaju/crmleone.git crmleone

2. Entrar no projeto e permitir scripts

  cd /www/wwwroot/crmleone
  chmod +x tools/deploy-aapanel-git.sh
  chmod +x tools/aapanel-hook-deploy.sh

3. Rodar deploy completo

  bash tools/deploy-aapanel-git.sh

Observacao importante:

1. Execute com bash, nao com sh.
2. Se usar sh, o script pode falhar antes de publicar a pasta api.

Esse script ja executa:

1. git pull --ff-only
2. npm ci
3. npm run build -- --outDir .deploy/live --emptyOutDir
4. composer install --no-dev --optimize-autoloader
5. Publicacao de api, src e vendor na pasta live
6. Link simbolico de uploads e logs para .deploy/shared

## 4. Configurar Website no aaPanel

No aaPanel, em Website:

1. Crie o site do dominio.
2. Tipo de servidor: Nginx.
3. Versao PHP: 8.3 (ou 8.2).
4. Document root do site: /www/wwwroot/crmleone/.deploy/live

## 5. Configurar Nginx da SPA + API

No arquivo de configuracao do site, use o bloco abaixo e ajuste apenas o fastcgi_pass conforme seu servidor:

  root /www/wwwroot/crmleone/.deploy/live;
  index index.php index.html;

  location ^~ /api/uploads/ {
     alias /www/wwwroot/crmleone/.deploy/shared/uploads/;
     access_log off;
     expires 7d;
     try_files $uri =404;
  }

  location ~ ^/api/(.+\.php)$ {
     include fastcgi_params;
     fastcgi_param SCRIPT_FILENAME /www/wwwroot/crmleone/.deploy/live/api/$1;
     fastcgi_param SCRIPT_NAME /api/$1;
     fastcgi_pass unix:/tmp/php-cgi-83.sock;
  }

  location / {
     try_files $uri $uri/ /index.html;
  }

Ordem das regras e obrigatoria:

1. /api/uploads/ primeiro.
2. /api/*.php depois.
3. Fallback da SPA por ultimo.

Sem essa ordem, login e endpoints da API vao quebrar.

## 6. Banco PostgreSQL

Crie banco e importe schema:

  sudo -u postgres psql -c "CREATE DATABASE crm_imoveis;"
  sudo -u postgres psql -d crm_imoveis -f /www/wwwroot/crmleone/database/schema.postgresql.sql

## 7. Variaveis de ambiente da API

Defina no ambiente do PHP-FPM (pool do site) uma das opcoes:

Opcao A, URL unica:

1. DATABASE_URL=postgres://usuario:senha@host:5432/crm_imoveis

Opcao B, variaveis separadas:

1. DB_HOST=127.0.0.1
2. DB_PORT=5432
3. DB_NAME=crm_imoveis
4. DB_USER=crm_user
5. DB_PASSWORD=senha_forte
6. PHP_APP_TZ=America/Sao_Paulo

Arquivo de conexao:

1. api/php-api-crm/src/config/database.php

## 8. Permissoes de uploads e logs

Garanta escrita:

  mkdir -p /www/wwwroot/crmleone/.deploy/shared/uploads
  mkdir -p /www/wwwroot/crmleone/.deploy/shared/logs
  chown -R www:www /www/wwwroot/crmleone/.deploy/shared/uploads /www/wwwroot/crmleone/.deploy/shared/logs
  chmod -R 775 /www/wwwroot/crmleone/.deploy/shared/uploads /www/wwwroot/crmleone/.deploy/shared/logs

## 9. Primeiro acesso

Opcional para criar admin inicial:

1. Acesse https://SEU_DOMINIO/api/create_admin.php apenas uma vez.
2. Login inicial: admin@imovelcrm.com
3. Senha inicial: admin123
4. Troque a senha imediatamente.

## 10. Atualizacao de versao

Para atualizar sem quebrar deploy:

  cd /www/wwwroot/crmleone
  bash tools/deploy-aapanel-git.sh

Esse comando atualiza codigo, rebuilda e republica.

## 11. Cron de automacoes

Se usar automacoes por e-mail, adicione cron:

  */5 * * * * /usr/bin/php /www/wwwroot/crmleone/.deploy/live/api/run_automations.php >> /www/wwwroot/crmleone/.deploy/shared/logs/cron_automations.log 2>&1

## 12. Validacao rapida pos-deploy

Executar:

1. nginx -t
2. service nginx reload
3. Abrir https://SEU_DOMINIO
4. Abrir https://SEU_DOMINIO/api/login.php

Se a URL da API responder, o roteamento esta correto.

## 13. Erro 502 no dominio

Checklist objetivo:

1. O dominio esta no Website, nao no Node Project.
2. Document root aponta para /www/wwwroot/crmleone/.deploy/live.
3. fastcgi_pass confere com o PHP real do servidor.
4. Nginx sem erro de sintaxe.
5. Pasta live contem index.html e pasta api.

Comandos de diagnostico:

1. nginx -t
2. ls -la /www/wwwroot/crmleone/.deploy/live
3. tail -n 100 /www/wwwlogs/SEU_DOMINIO.error.log

## 14. Erros comuns e causa real

1. npm start falha: este projeto nao possui script start em producao.
2. git pull bloqueado: ha mudancas locais no checkout; use somente o script de deploy oficial.
3. API retorna HTML da SPA: ordem das regras Nginx incorreta.
4. Upload falha: permissao de escrita em .deploy/shared/uploads.

## 15. Fluxo curto para operar no dia a dia

Sempre que precisar publicar:

1. cd /www/wwwroot/crmleone
2. bash tools/deploy-aapanel-git.sh
3. nginx -t && service nginx reload

Com isso, frontend e API sobem juntos no mesmo dominio.