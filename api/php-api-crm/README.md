# PHP API CRM

Este projeto é uma API em PHP para um sistema de gerenciamento de imóveis, que permite operações CRUD (Criar, Ler, Atualizar, Deletar) para diferentes entidades, como propriedades, projetos de construção, agentes, leads, contatos, eventos de calendário, documentos, tabelas de vendas, relatórios e configurações.

## Estrutura do Projeto

```
php-api-crm
├── src
│   ├── config
│   │   └── database.php          # Configuração da conexão com o banco de dados PostgreSQL
│   ├── controllers
│   │   ├── PropertyController.php # Controlador para operações CRUD de propriedades
│   │   ├── ConstructionProjectController.php # Controlador para operações CRUD de projetos de construção
│   │   ├── AgentController.php    # Controlador para operações CRUD de agentes
│   │   ├── LeadController.php     # Controlador para operações CRUD de leads
│   │   ├── ContactController.php   # Controlador para operações CRUD de contatos
│   │   ├── CalendarController.php  # Controlador para operações CRUD de eventos de calendário
│   │   ├── DocumentController.php  # Controlador para operações CRUD de documentos
│   │   ├── SalesTableController.php # Controlador para operações CRUD de tabelas de vendas
│   │   ├── ReportController.php    # Controlador para operações CRUD de relatórios
│   │   └── SettingsController.php  # Controlador para operações CRUD de configurações
│   ├── models
│   │   ├── Property.php            # Modelo para a estrutura de dados de uma propriedade
│   │   ├── ConstructionProject.php  # Modelo para a estrutura de dados de um projeto de construção
│   │   ├── Agent.php               # Modelo para a estrutura de dados de um agente
│   │   ├── Lead.php                # Modelo para a estrutura de dados de um lead
│   │   ├── Contact.php             # Modelo para a estrutura de dados de um contato
│   │   ├── Calendar.php            # Modelo para a estrutura de dados de um evento de calendário
│   │   ├── Document.php            # Modelo para a estrutura de dados de um documento
│   │   ├── SalesTable.php          # Modelo para a estrutura de dados de uma tabela de vendas
│   │   ├── Report.php              # Modelo para a estrutura de dados de um relatório
│   │   └── Settings.php            # Modelo para a estrutura de dados de configurações do sistema
│   ├── routes
│   │   └── api.php                 # Definição das rotas da API
│   └── helpers
│       └── response.php            # Funções auxiliares para formatar respostas da API
├── public
│   └── index.php                   # Ponto de entrada da aplicação
├── composer.json                   # Configuração do Composer
└── README.md                       # Documentação do projeto
```

## Instalação

1. Clone o repositório:
   ```
   git clone <URL_DO_REPOSITORIO>
   ```

2. Navegue até o diretório do projeto:
   ```
   cd php-api-crm
   ```

3. Instale as dependências do Composer:
   ```
   composer install
   ```

4. Configure o arquivo `src/config/database.php` com suas credenciais do banco de dados PostgreSQL.

## Uso

Para iniciar a API, acesse o arquivo `public/index.php` em seu servidor web. As rotas da API estão definidas em `src/routes/api.php` e podem ser acessadas conforme a estrutura definida.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir um pull request ou relatar problemas.

## Licença

Este projeto está licenciado sob a MIT License. Veja o arquivo LICENSE para mais detalhes.

## Timezone e formato de datas

Por padrão a API define a timezone do PHP para `America/Sao_Paulo`, mas você pode sobrescrever isso definindo a variável de ambiente `PHP_APP_TZ` (por exemplo `PHP_APP_TZ=America/Sao_Paulo`).

Recomendações:
- Frontend: preferível enviar datas em ISO 8601 (UTC) — ex: `2025-09-14T00:00:00.000Z`. O backend converte automaticamente para a timezone do servidor antes de salvar.
- Alternativa simples: enviar strings no formato local `YYYY-MM-DD HH:MM:SS` (o backend também aceita esse formato).

Se o servidor estiver em outro fuso, defina `PHP_APP_TZ` para o fuso desejado para manter consistência entre o que o usuário vê e o que é gravado no banco.