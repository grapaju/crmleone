# Deploy do CRM Leone no aaPanel

Este projeto funciona melhor no aaPanel quando frontend e API ficam no mesmo dominio, com a API exposta em `/api`.

Arquitetura recomendada:

- Frontend React/Vite publicado como arquivos estaticos.
- API PHP publicada no mesmo site em `/api`.
- PostgreSQL separado, acessado pela API via `DATABASE_URL` ou `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- Uploads servidos por `/api/uploads/...`.

## 1. Requisitos do servidor

- aaPanel com Nginx.
- PHP 8.1, 8.2 ou 8.3.
- Extensoes PHP habilitadas: `pdo_pgsql`, `pgsql`, `mbstring`, `openssl`, `fileinfo`, `session`.
- PostgreSQL acessivel a partir do servidor.
- Composer disponivel no servidor ou build da API feito antes do upload.
- Node.js apenas para gerar o build do frontend. Nao precisa rodar o frontend em Node em producao.

## 1.1. Cenario deste servidor

Valores informados para este deploy:

- dominio: `https://leonecrm.psys.tech/`
- raiz do site: `/www/wwwroot/crmleone`
- versao do PHP: `8.3`
- estrategia de publicacao: `Git`

## 2. Estrutura de publicacao recomendada

No seu servidor, publique em uma estrutura assim:

```text
/www/wwwroot/crmleone/
  index.html
  assets/
  api/
    agents.php
    login.php
    properties.php
    uploads/
    logs/
  src/
  vendor/
```

Como chegar nisso:

1. Gere o build do frontend com `npm install` e `npm run build`.
2. Copie o conteudo de `dist/` para a raiz do site no aaPanel.
3. Copie o conteudo de `api/php-api-crm/public/` para a pasta `/api` do site.
4. Copie `api/php-api-crm/src/` para `/src` na raiz do site.
5. Copie `api/php-api-crm/vendor/` para `/vendor` na raiz do site.

Motivo dessa estrutura:

- Os arquivos PHP em `/api` fazem `require_once '../src/...'` e `require_once '../vendor/...'`.
- Se voce publicar a pasta PHP em outro formato, esses caminhos relativos quebram.

## 3. Publicacao por Git no aaPanel

Se o repositorio sera clonado diretamente em `/www/wwwroot/crmleone`, o fluxo mais simples e:

1. aaPanel faz `git pull` no diretorio do site.
2. voce roda build do frontend no proprio servidor.
3. voce roda `composer install` para a API.
4. voce publica o build em `/www/wwwroot/crmleone` e sincroniza a API publica para `/www/wwwroot/crmleone/api`.

O projeto ja ficou com um script util para isso:

- `tools/deploy-aapanel-git.sh`

Fluxo sugerido no servidor:

```bash
cd /www/wwwroot/crmleone
chmod +x tools/deploy-aapanel-git.sh
bash tools/deploy-aapanel-git.sh
```

O script faz:

- `git pull --ff-only`
- `npm install`
- `npm run build`
- `composer install --no-dev --optimize-autoloader`
- sincronizacao de `dist/` para a raiz do site
- sincronizacao de `api/php-api-crm/public/` para `/api`
- sincronizacao de `api/php-api-crm/src/` para `/src`
- sincronizacao de `api/php-api-crm/vendor/` para `/vendor`

Observacao:

- o script preserva `api/uploads` e `api/logs`
- se rodar como root, ele tambem ajusta permissao dessas duas pastas

## 4. Build e upload do frontend

Na maquina de build:

```bash
npm install
npm run build
```

Depois envie para o servidor:

- `dist/index.html` e `dist/assets/` para a raiz do site.
- Nao envie a pasta `src` do frontend para producao; ela nao e usada depois do build.

## 5. Publicacao da API PHP

Na API:

1. Entre em `api/php-api-crm`.
2. Rode `composer install --no-dev --optimize-autoloader`.
3. Envie para o servidor:
   - `public/*` para `/api`
   - `src/` para `/src`
   - `vendor/` para `/vendor`

Permissoes importantes:

- `/api/uploads` precisa ser gravavel pelo usuario do PHP.
- `/api/logs` precisa ser gravavel pelo usuario do PHP.

Se essas pastas nao existirem, crie antes do primeiro uso.

## 6. Banco PostgreSQL

Crie o banco e importe o schema nativo PostgreSQL do projeto:

```bash
psql -h HOST -p 5432 -U USUARIO -d crm_imoveis -f database/schema.postgresql.sql
```

O arquivo usado em producao deve ser:

- `database/schema.postgresql.sql`

Nao use `database/schema.sql` para PostgreSQL; ele e o schema legado de MySQL/MariaDB.

## 7. Variaveis de ambiente da API

O backend aceita duas formas:

1. `DATABASE_URL`
2. Variaveis separadas: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

Exemplo com variaveis separadas:

```text
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=crm_imoveis
DB_USER=crm_user
DB_PASSWORD=sua_senha_forte
PHP_APP_TZ=America/Sao_Paulo
RUN_AUTOMATIONS_WINDOW=5
CORS_ALLOWED_ORIGIN=https://seu-dominio.com.br
```

Se o aaPanel estiver usando PHP-FPM, configure essas variaveis no pool PHP do site ou em mecanismo equivalente do painel. Se isso nao estiver disponivel, voce pode adaptar o carregamento para usar um arquivo de ambiente local do servidor.

Observacao:

- Se frontend e API estiverem no mesmo dominio, `CORS_ALLOWED_ORIGIN` normalmente nao e necessario.
- So configure essa variavel se realmente for usar frontend e API em origens diferentes.

## 8. Configuracao Nginx no aaPanel

Objetivo:

- Arquivos estaticos do frontend na raiz.
- Qualquer `/api/*.php` executado pelo PHP.
- Qualquer rota `/api/uploads/...` servida como arquivo estatico.
- Qualquer rota SPA cair em `index.html`.

Bloco adaptado para o seu site:

```nginx
root /www/wwwroot/crmleone;
index index.php index.html;

location ^~ /api/uploads/ {
  alias /www/wwwroot/crmleone/api/uploads/;
    access_log off;
    expires 7d;
    try_files $uri =404;
}

location ~ ^/api/(.+\.php)$ {
    include fastcgi_params;
  fastcgi_param SCRIPT_FILENAME /www/wwwroot/crmleone/api/$1;
    fastcgi_param SCRIPT_NAME /api/$1;
  fastcgi_pass unix:/tmp/php-cgi-83.sock;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

Ajustes obrigatorios:

- confirme no aaPanel se o socket do PHP 8.3 e realmente `unix:/tmp/php-cgi-83.sock`
- se o aaPanel usar upstream nomeado em vez de socket, troque o `fastcgi_pass` de acordo com o painel

Observacao importante:

- A regra `location ^~ /api/uploads/` deve vir antes da regra SPA.
- A regra `location ~ ^/api/(.+\.php)$` deve existir antes do fallback de SPA.
- Sem isso, login, uploads e endpoints PHP vao cair no `index.html` e gerar 404, 405 ou erro de parse no frontend.

## 9. Primeiro usuario admin

O projeto possui um script utilitario:

- `/api/create_admin.php`

Ele cria o usuario padrao:

- email: `admin@imovelcrm.com`
- senha inicial: `admin123`

Fluxo recomendado:

1. Rode uma unica vez.
2. Entre no sistema.
3. Altere a senha imediatamente.
4. Remova ou proteja o arquivo depois disso.

## 10. Cron para automacoes

Se voce usa envio automatico de tabelas, agende este script:

- `/api/run_automations.php`

Exemplo de cron a cada 5 minutos:

```bash
*/5 * * * * /usr/bin/php /www/wwwroot/crmleone/api/run_automations.php
```

O script respeita:

- `PHP_TZ` para timezone do processo
- `RUN_AUTOMATIONS_WINDOW` para janela de disparo em minutos

## 11. Checklist de validacao apos publicar

Valide nesta ordem:

1. Abra a raiz do site e confirme que a SPA carrega.
2. Teste `https://seu-dominio/api/login.php` com uma requisicao real.
3. Faça login pelo frontend.
4. Teste leitura de propriedades, projetos, unidades e leads.
5. Teste upload de imagem e documento.
6. Verifique se arquivos aparecem em `/api/uploads`.
7. Verifique logs em `/api/logs`.

## 12. Pontos de atencao especificos deste projeto

### CORS e login

O projeto foi claramente pensado para frontend e API no mesmo host, usando caminhos relativos como `/api/login.php` e `/api/properties.php`.

Isso e o que voce deve manter em producao.

Se tentar separar frontend e API em dominios diferentes, voce vai ter que revisar pelo menos estes arquivos:

- `api/php-api-crm/public/login.php`
- `api/php-api-crm/public/documents.php`

Neles ha cabecalhos CORS acoplados ao ambiente local. Em deploy same-origin isso deixa de ser relevante; em cross-origin isso vira problema de login e sessao.

### Uploads

As imagens e documentos sao gravados abaixo de `/api/uploads`.

Sem permissao de escrita no disco:

- upload de imagens falha
- upload de documentos falha
- anexos de tabelas podem falhar

### PHPMailer

Os envios de e-mail dependem do Composer e do `vendor/autoload.php`.

Se `vendor/` nao estiver presente na raiz esperada, funcionalidades de SMTP e automacao vao quebrar.

## 13. Fluxo resumido recomendado

1. Criar o site no aaPanel com Nginx + PHP 8.3.
2. Criar o banco PostgreSQL e importar `database/schema.postgresql.sql`.
3. Clonar o repositorio Git em `/www/wwwroot/crmleone`.
4. Rodar `bash tools/deploy-aapanel-git.sh` no servidor.
5. Publicar a API em `/api`, com `src/` e `vendor/` na raiz do site.
6. Configurar Nginx com fallback SPA e execucao de `/api/*.php`.
7. Ajustar permissoes de `/api/uploads` e `/api/logs`.
8. Criar o admin inicial.
9. Testar login, listagens, uploads e e-mail.
10. Configurar cron se usar automacoes.

## 14. Problemas comuns no aaPanel

### 404 ou 405 no login

Quase sempre e Nginx encaminhando `/api/login.php` para a SPA. Revise a ordem das regras do site.

### A SPA abre, mas tudo da API falha

Normalmente um destes casos:

- `src/` nao foi publicado na raiz correta.
- `vendor/` nao foi publicado na raiz correta.
- variaveis do banco nao chegaram ao PHP.
- extensao `pdo_pgsql` nao esta habilitada.

### Upload retorna sucesso parcial ou erro 500

Verifique:

- permissao de escrita em `/api/uploads`
- limite de upload do PHP
- `post_max_size`
- `upload_max_filesize`
- logs em `/api/logs`

### Automacoes nao disparam

Verifique:

- cron do servidor
- caminho do binario PHP no cron
- timezone do processo
- logs do script em `/api/logs`

## 15. O que eu recomendo para este deploy

Para este projeto, a opcao mais segura e:

- um unico dominio
- frontend na raiz
- API PHP em `/api`
- PostgreSQL externo ou local
- cron para automacoes

## 16. Sequencia operacional para o seu caso

1. No aaPanel, aponte o site `leonecrm.psys.tech` para `/www/wwwroot/crmleone` usando PHP 8.3.
2. Faça clone do repositorio Git nesse mesmo diretorio.
3. No terminal do servidor, rode:

```bash
cd /www/wwwroot/crmleone
git config --global --add safe.directory /www/wwwroot/crmleone
chmod +x tools/deploy-aapanel-git.sh
bash tools/deploy-aapanel-git.sh
```

4. Configure o Nginx do site com o bloco da secao 8.
5. Configure as variaveis de banco no PHP 8.3 do site.
6. Crie as pastas gravaveis se necessario:

```bash
mkdir -p /www/wwwroot/crmleone/api/uploads /www/wwwroot/crmleone/api/logs
chown -R www:www /www/wwwroot/crmleone/api/uploads /www/wwwroot/crmleone/api/logs
chmod -R 775 /www/wwwroot/crmleone/api/uploads /www/wwwroot/crmleone/api/logs
```

7. Importe o banco PostgreSQL.
8. Acesse `/api/create_admin.php` uma unica vez.
9. Teste login em `https://leonecrm.psys.tech/`.
10. Configure o cron de automacoes se precisar.

Se voce quiser, no proximo passo eu posso te passar um roteiro operacional exato para o seu servidor aaPanel, incluindo:

1. estrutura final de pastas no Linux
2. bloco Nginx pronto para colar no site
3. ordem de comandos de build e upload
4. check de validacao depois do go-live