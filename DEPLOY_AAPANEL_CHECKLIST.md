# Checklist de Deploy no aaPanel (CRM Leone)

Use esta lista para executar o deploy em producao sem pular etapas.

## 0) Confirmar arquitetura

- [ ] Nao usar Node Project para este sistema.
- [ ] Usar Website (Nginx) + PHP-FPM + PostgreSQL.
- [ ] Dominio unico para frontend e API.

## 1) Pre-requisitos do servidor

- [ ] Nginx instalado no aaPanel.
- [ ] PHP 8.2 ou 8.3 ativo no site.
- [ ] Extensoes PHP: pdo_pgsql, pgsql, mbstring, openssl, fileinfo, session.
- [ ] PostgreSQL acessivel no servidor.
- [ ] Node 18+ instalado.
- [ ] Composer instalado.
- [ ] Git instalado.

## 2) Estrutura de diretorios

- [ ] Repositorio em /www/wwwroot/crmleone
- [ ] Publicacao em /www/wwwroot/crmleone/.deploy/live
- [ ] Persistencia em /www/wwwroot/crmleone/.deploy/shared

## 3) Primeiro deploy (comandos)

```bash
cd /www/wwwroot
git clone https://github.com/grapaju/crmleone.git crmleone
cd /www/wwwroot/crmleone
chmod +x tools/deploy-aapanel-git.sh
chmod +x tools/aapanel-hook-deploy.sh
bash tools/deploy-aapanel-git.sh
```

- [ ] Deploy executado com bash (nao usar sh).

- [ ] Script executou sem erro.
- [ ] Existe /www/wwwroot/crmleone/.deploy/live/index.html
- [ ] Existe /www/wwwroot/crmleone/.deploy/live/api

## 4) Configurar site no aaPanel

- [ ] Website criado no dominio correto.
- [ ] Tipo Nginx.
- [ ] PHP 8.3 (ou 8.2) selecionado.
- [ ] Document root: /www/wwwroot/crmleone/.deploy/live

## 5) Nginx (colar no conf do site)

Ajustar apenas fastcgi_pass conforme seu PHP no servidor.

```nginx
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
```

- [ ] Regra /api/uploads antes de /api/*.php
- [ ] Regra /api/*.php antes de location /
- [ ] Nginx validado com nginx -t

## 6) Banco PostgreSQL

```bash
sudo -u postgres psql -c "CREATE DATABASE crm_imoveis;"
sudo -u postgres psql -d crm_imoveis -f /www/wwwroot/crmleone/database/schema.postgresql.sql
```

- [ ] Banco criado/importado sem erro.

## 7) Ambiente da API

Escolher uma forma:

- [ ] DATABASE_URL=postgres://usuario:senha@host:5432/crm_imoveis

ou

- [ ] DB_HOST
- [ ] DB_PORT
- [ ] DB_NAME
- [ ] DB_USER
- [ ] DB_PASSWORD
- [ ] PHP_APP_TZ=America/Sao_Paulo

- [ ] Variaveis aplicadas no PHP-FPM do site.

## 8) Permissoes de escrita

```bash
mkdir -p /www/wwwroot/crmleone/.deploy/shared/uploads
mkdir -p /www/wwwroot/crmleone/.deploy/shared/logs
chown -R www:www /www/wwwroot/crmleone/.deploy/shared/uploads /www/wwwroot/crmleone/.deploy/shared/logs
chmod -R 775 /www/wwwroot/crmleone/.deploy/shared/uploads /www/wwwroot/crmleone/.deploy/shared/logs
```

- [ ] Uploads e logs com permissao correta.

## 9) Primeiro acesso

- [ ] Acessar https://SEU_DOMINIO
- [ ] Acessar https://SEU_DOMINIO/api/login.php
- [ ] Se necessario, criar admin em https://SEU_DOMINIO/api/create_admin.php
- [ ] Trocar senha do admin no primeiro login

## 10) Atualizacao de versao (dia a dia)

```bash
cd /www/wwwroot/crmleone
bash tools/deploy-aapanel-git.sh
nginx -t && service nginx reload
```

- [ ] Atualizacao feita sem erro.

## 11) Cron de automacoes (opcional)

```bash
*/5 * * * * /usr/bin/php /www/wwwroot/crmleone/.deploy/live/api/run_automations.php >> /www/wwwroot/crmleone/.deploy/shared/logs/cron_automations.log 2>&1
```

- [ ] Cron ativo (se o modulo for usado).

## 12) Se aparecer erro 502

```bash
nginx -t
ls -la /www/wwwroot/crmleone/.deploy/live
tail -n 100 /www/wwwlogs/SEU_DOMINIO.error.log
```

Checklist rapido de causa:

- [ ] Dominio nao esta no Node Project.
- [ ] Document root correto.
- [ ] fastcgi_pass correto.
- [ ] Regras /api e SPA na ordem certa.
