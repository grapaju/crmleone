# Web App v4

Documentação rápida do projeto frontend + API local (PHP) usada no workspace.

## Visão geral
- Frontend: React + Vite (em `src/`).
- Backend: PHP API localizada em `api/php-api-crm/public/`.
- Banco de dados: MySQL/MariaDB (configuração em `api/php-api-crm/src/config/Database.php`).

### Gerador Inteligente de Unidades (novo)
- Substitui o antigo “Cadastro em Lote”.
- Local: página `ConstructionProjectForm.jsx` (Cadastrar/Editar Empreendimento) > aba “Gerador Inteligente”.
- Fluxo:
  1) Etapa 1 — Dados gerais: selecione a torre (ou “Todas as torres”), defina nº de pavimentos, unidades por pavimento, pavimentos-tipo (início/fim), térreo/cobertura/mezanino, CUB e data base.
  2) Etapa 2 — Tipologias: cadastre modelos (nome, unit_type opcional, área, dorms, suítes, vagas, fator de valorização, andares aplicáveis, posição e quantidade por pavimento).
  3) Etapa 3 — Regras: pavimentos altos (+% por andar), cobertura +%, térreo com jardim +%, canto +%. Gere unidades e, se quiser, “Salvar na API”.
- Evita duplicatas por torre + número da unidade. Quando a obra já existe (tem ID), é possível salvar imediatamente.

## Como rodar localmente
1. Backend (XAMPP): coloque a pasta `api/php-api-crm/public` acessível via `http://localhost/v4/api/php-api-crm/public/` (já configurado no workspace).
2. Frontend:
   - Instale dependências: `npm install`
   - Rodar em modo dev: `npm run dev`

## Endpoints importantes
  - GET: retorna lista de automações com campos: `id, table_id, dayOfMonth, sendTime (hora_envio), recipients, recipientsList, status, title, message, tableName`.
  - POST: aceita `tableId` (ou `table_id`), `dayOfMonth` (ou `dia_mes`), `sendTime` (ou `hora_envio`), `title`, `message`, `recipientsList` (array de {name,email}) ou `recipients` string.

### Performance History (novo)

Endpoint: `GET /api/php-api-crm/public/performance_history.php?agent_id=ID_OPCIONAL`

Retorna métricas agregadas do mês atual (até o momento) e mês anterior:

```
{
  "generatedAt": "2025-09-15T18:30:00-03:00",
  "agentId": 1,
  "currentMonth": {
    "start": "2025-09-01",
    "activitiesDone": 12,
    "contactsMade": 5,
    "dealsClosed": 2
  },
  "previousMonth": {
    "start": "2025-08-01",
    "activitiesDone": 30,
    "contactsMade": 14,
    "dealsClosed": 4
  }
}
```

Uso no frontend: service `src/services/performanceService.js` (`fetchPerformanceHistory` e `mergeHistoryIntoMetrics`). O painel `PerformancePanel` usa campos `prevMonth*` para calcular deltas.
## Automations UI changes
- O formulário de criação/edição de automações agora abre em um drawer lateral (direita) amplo.
- O formulário envia `title` e `message` (corpo do e-mail) e armazena no banco.
- Após criar uma automação, o frontend dispara um evento `automations:created` e a lista é recarregada automaticamente.

### Arquivos frontend relevantes
- `src/pages/SalesTables.jsx` — página pai que lista tabelas e abre o drawer de automações.
- `src/pages/SalesTableForm.jsx` / `src/pages/SalesAutomationForm.jsx` — formulário de criação/edição de automações.
- `src/pages/SalesAutomations.jsx` — lista de automações e lógica de refresh.

### Como testar (end-to-end rápido)
1. Inicie o backend (XAMPP) e certifique-se que `api/php-api-crm/public/` é acessível.
2. Rode o frontend: `npm run dev`.
3. No frontend, abra a página de Tabelas de Vendas (Sales Tables).
4. Clique em uma tabela, abra o drawer de automações e crie uma nova automação (preencha dia do mês, hora, título, mensagem e destinatários).
5. Observe o log do backend em `api/php-api-crm/logs/` para ver tentativas de envio.
6. Verifique via API: `GET api/php-api-crm/public/automations.php` deve retornar a automação com `tableName` e `title`.

## Problemas conhecidos / dicas
- Se automações não aparecem, verifique `api/php-api-crm/public/automations.php` e se o campo `table_id` existe e está correto.
- Se o backend rejeitar colunas extras (ex.: `tittle`), verifique se há migração necessária.

### Migrando banco quando já existe

Se você já tem o banco criado com a versão anterior do projeto, adicione as colunas `description` e `tags` em `properties` executando no MySQL/PhpMyAdmin:

```sql
ALTER TABLE properties
  ADD COLUMN description TEXT DEFAULT NULL,
  ADD COLUMN tags TEXT DEFAULT NULL;
```

Depois, reinicie o servidor (XAMPP/Apache) se necessário e teste a criação/edição de imóveis no frontend. O campo "Descrição" agora será enviado como `description` e persistido.

### Nota técnica (últimas correções)
- `automations.php` foi ajustado para fazer JOIN corretamente com `sales_tables` e retornar `tableName` (nome da tabela) junto aos dados da automação.
- Houve inconsistência no nome do campo `title` (algumas versões usavam `tittle`). Padronize para `title` no frontend e no banco para evitar problemas.

## Contato
Para dúvidas rápidas, verifique os logs em `api/php-api-crm/logs/`.

---

## Detalhes de Integração Leads (Score, Dicas e Atividades)

### Endpoints Utilizados

| Finalidade | Endpoint (direto) | Via Proxy (frontend) | Método |
|------------|-------------------|----------------------|--------|
| Detalhes de Lead | `http://localhost/v4/api/php-api-crm/public/lead-details.php?id={id}` | `/api/lead-details.php?id={id}` | GET |
| Toggle Dica (ativar/desativar) | `http://localhost/v4/api/php-api-crm/public/lead-tip-toggle.php` | `/api/lead-tip-toggle.php` | POST |

Corpo da requisição (toggle dica):
```json
{ "leadId": 12, "tipId": 4, "ativa": true }
```

Resposta esperada:
```json
{ "success": true }
```

### Proxy no Vite
Adicionado em `vite.config.js`:
```js
proxy: {
  '/api': {
    target: 'http://localhost/v4/api/php-api-crm/public',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api/, ''),
  }
}
```
Com isso, durante o desenvolvimento basta usar caminhos relativos `/api/...` no frontend. Em produção (build estático sem Vite) use a rota real ou configure reescrita no servidor web.

### Componente `LeadDetails`
Principais melhorias recentes:
- Layout unificado com padrão dos detalhes de imóvel (grid 2/3 + 1/3).
- Filtro de atividades por tipo.
- Exibição dinâmica de dicas ativas vs todas.
- Cor por prioridade + fallback defensivo.
- Atualização otimista com rollback em falha para toggle de dicas.
- Cards: Score, Atividades, Dicas, Resumo Rápido, Próximos Passos.

### Erros Comuns e Soluções
| Sintoma | Causa Provável | Ação |
|--------|----------------|------|
| 404 em `/api/lead-tip-toggle.php` | Proxy ausente ou servidor PHP parado | Verificar `vite.config.js` e se Apache/XAMPP está ativo |
| `success: false` | Falha no banco (constraints) | Checar logs em `api/php-api-crm/logs/` |
| `priority.toLowerCase is not a function` | Prioridade retornando número/objeto | Já mitigado com normalização; conferir resposta do endpoint |

### Próximas Melhorias Sugeridas
1. Extrair serviço unificado: `src/services/leadService.js`
2. Adicionar testes de unidade (ex.: Jest + React Testing Library) para estados de loading/erro.
3. Implementar skeleton loaders.
4. Paginação ou lazy load de atividades se > 100.
5. Indexar colunas de atividades no banco para performance (ex.: `created_at`, `lead_id`).
6. Implementar endpoint dedicado para histórico de mudanças de status.
7. Adicionar campo "próximo contato" + lembrete.
8. Versão futura: `/api/v1/leads/{id}` (estrutura REST clara, sem `.php`).

### Padrão Recomendado para Novos Endpoints
1. Criar arquivo em `api/php-api-crm/public/` ex.: `lead-notes.php`.
2. Incluir cabeçalhos CORS e OPTIONS.
3. Validar método HTTP explicitamente.
4. Retornar sempre JSON (`{ error: string }` ou `{ data: ..., meta: ... }`).
5. Para múltiplas ações num mesmo recurso → considerar chave `action` no body ou separar arquivos.

### Exemplo de Cliente Genérico (Opcional)
```js
// src/services/apiClient.js (sugestão)
const API_BASE = '/api';
export async function apiFetch(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);
  return data;
}
```

---
*Última atualização desta seção: melhoria de Lead Details e padronização de proxy.*

---

## Sistema de Permissões (Propriedades, Empreendimentos e Unidades)

### Objetivo
Permitir que administradores controlem exatamente quais imóveis avulsos, empreendimentos (obras) e unidades específicas cada agente pode visualizar e acessar em detalhe.

### Camadas de Permissão
1. Propriedade Avulsa (property): acesso direto à ficha de um imóvel independente.
2. Empreendimento (project): acesso à ficha do empreendimento + todas as suas unidades (herdado).
3. Unidade (unit): acesso direto ao detalhe de uma unidade, mesmo se o empreendimento não foi liberado (não exibe o empreendimento na lista geral).

### Tabelas
- `agent_property_access (agent_id, property_id)`
- `agent_project_access (agent_id, project_id)`
- `agent_unit_access (agent_id, unit_id)`

### Endpoints Principais
- `agent_property_access.php` (GET/POST)
- `agent_project_access.php` (GET/POST)
- `agent_unit_access.php` (GET/POST)

### Serviços Frontend
| Entidade | Arquivo | Métodos |
|----------|---------|---------|
| Propriedades | `propertyAccessService.js` | `getAccessiblePropertyIds(agentId)`, `setAccessiblePropertyIds(agentId, ids)` |
| Projetos | `projectAccessService.js` | `get(agentId)`, `set(agentId, projectIds)` |
| Unidades | `unitAccessService.js` | `get(agentId)`, `set(agentId, unitIds)` |

### Caching
Guardado em `sessionStorage` para reduzir requisições repetidas:
```
perm_properties_access
perm_projects_access
perm_units_access
```
Cada chave mantém um objeto: `{ [userId]: [arrayDeIds] }`.

### UI Administrativa
Página: `AgentPermissions.jsx`

Abas:
1. Imóveis Avulsos
2. Empreendimentos / Unidades (hierárquico: expandir empreendimento para listar e marcar unidades)

Recursos:
- Busca contextual (título / endereço / número da unidade ao expandir).
- Selecionar Todos conforme aba.
- Carregamento lazy de unidades por empreendimento (on-demand ao expandir).
- Exibição de estado “Carregando unidades …”.
- Marcação independente de unidade se empreendimento não deve ser liberado por completo.

### Guards
Aplicados em:
- `PropertyDetails.jsx`
- `ConstructionProjectDetails.jsx`
- `UnitDetails.jsx`

Lógica:
1. Admin (role=admin) bypass.
2. Verifica cache -> se ausente, busca e popula.
3. Se id não presente e sem fallback (unidade específica), bloqueia com mensagem amigável.

### Regras de Herança
- Permissão de empreendimento => inclui todas as unidades (sem necessidade de marcar cada uma).
- Permissão de unidade isolada NÃO faz empreendimento aparecer na listagem principal.
- Revogação exige novo navigation ou reload (cache simples por sessão).

### Fluxos Comuns
| Caso | Configuração | Resultado |
|------|--------------|-----------|
| Acesso Total | Empreendimento marcado | Lista empreendimento + todas unidades | 
| Unidade Isolada | Empreendimento desmarcado + unidade marcada | Unidade acessível via link direto; empreendimento não aparece |
| Sem Permissão | Nada marcado | Bloqueio em qualquer detalhe |

### Testes Recomendados
1. Marcar empreendimento e validar acesso a qualquer unidade.
2. Revogar empreendimento e marcar duas unidades isoladas — conferir bloqueio no detalhe do empreendimento e acesso direto nas unidades.
3. Limpar `sessionStorage` e repetir para garantir fluxo consistente.
4. Tentar acesso manual por URL de recurso não permitido.

### Melhoria Futuras Sugeridas
1. Versão das permissões / timestamp para invalidar cache automaticamente.
2. Endpoint agregado retornando todas as permissões em uma única chamada.
3. Flags adicionais (visualizar/editar/excluir) por entidade.
4. Log/auditoria de mudanças (quem alterou o quê e quando).
5. WebSocket/polling leve para revogação em tempo quase real.
6. Virtualização de listas se volume crescer (react-window / react-virtualized).
7. Exportar/importar matriz de permissões (CSV/JSON).
8. Testes automatizados com mocks (`msw`) e Jest.

### Blueprint para Nova Entidade com Permissões
1. Criar tabela `agent_<entidade>_access`.
2. Endpoint `agent_<entidade>_access.php` com GET/POST.
3. Service `<entidade>AccessService.js` seguindo assinatura dos existentes.
4. Ajustar UI de permissões adicionando bloco/aba.
5. Implementar guard consumindo cache + fallback de fetch.

---
*Última atualização desta seção: Sistema de permissões unificado (propriedades, empreendimentos e unidades).* 


## Dashboard (Visão Admin x Agente)

Foram implementadas melhorias estruturais no `Dashboard` para separar claramente as necessidades de Administradores e Agentes.

### Componentização
- `AdminDashboard.jsx`: KPIs consolidados, análise preditiva e ranking de leads.
- `AgentDashboard.jsx`: Foco operacional com Kanban de atividades e alertas rápidos.

### Funcionalidades Atuais
- KPIs: Valor em venda, total vendido, leads quentes, imóveis reservados.
- Kanban de atividades: Agrupa compromissos e sugestões de próxima ação (tips). Atualização de status dispara persistência.
- Sugestões (Next Actions): Geradas por `generateNextActionsForLeads` e filtradas para evitar duplicidades com compromissos já pendentes.
- Alertas rápidos: Leads parados >7 dias, agendamentos pendentes, leads quentes aguardando ação.

### Novas Funcionalidades (Dashboard)
- Funil de Leads (`FunnelChart.jsx`): agregação por status com porcentagem relativa ao topo.
- SLA Médio de Resposta (`ResponseSla.jsx`): média em horas baseada em `lead.history.responseTime` agrupada por agente.
- Filtros no Kanban do Agente: filtro por status (A Fazer, Em Andamento, Concluído) e busca textual (lead, imóvel, tipo, label). Inclui ação de limpar.
- Padronização de Botões no Kanban: uso do componente `Button` (mesmo padrão visual da página `LeadDetails`).

### Estrutura Relacionada
- `src/pages/Dashboard.jsx`: agrega dados de funil e SLA e repassa para componentes de visão.
- `src/components/dashboard/admin/FunnelChart.jsx`
- `src/components/dashboard/admin/ResponseSla.jsx`
- `src/components/dashboard/agent/AgentDashboard.jsx` (filtros adicionados + uso de `ActivityKanbanBoard`).
- `src/components/dashboard/kanban/ActivityKanbanCard.jsx` atualizado para estilo padrão.

### Tratamento de Dados
- Serviços (`leadService`, `appointmentService`, `activityService`) fazem normalização defensiva para lidar com respostas heterogêneas da API.
- Dashboard utiliza essas estruturas já normalizadas, reduzindo necessidade de `try/catch` duplicados.

### Observações Técnicas
- A lista de estágios do funil pode ser ajustada em `Dashboard.jsx` (array `order`).
- Se `lead.history.responseTime` não existir ou não for numérico, o lead é ignorado no cálculo de SLA.
- Filtros do Kanban não mutam dados originais; apenas filtragem em memória (performático para volumes pequenos/médios). Considerar paginação/carga incremental se a lista crescer muito.

### Próximos Passos Recomendados
1. Arrastar e soltar (drag & drop) no Kanban para mudar status visualmente.
2. Filtros de período e agente (na visão admin).
3. Gráfico de funil (pipeline) por estágio do lead.
4. Indicador de SLA de resposta (tempo médio de primeira resposta).
5. Integração de criação rápida de atividade direto do Kanban.
6. Cache leve em `sessionStorage` para carga mais rápida após primeiro fetch.

### Próximos Melhoramentos Sugeridos
1. Drag & drop real nas colunas (já existe dependência dnd-kit, integrar com `ActivityKanbanBoard`).
2. Exportar CSV do funil e SLA.
3. Gráfico temporal de evolução do SLA (linha ou área).
4. Indicador de variação (delta) das etapas do funil vs período anterior.
5. Filtro avançado multi-status (checkbox) e por data de próxima ação.

---

### Fluxo de Sugestões (Next Actions) Separado
A partir da refatoração mais recente:
- Sugestões (dicas) não entram mais no Kanban.
- Componente: `SuggestionList.jsx` em `components/dashboard/agent/`.
- Cada sugestestão pode: Agendar, Abrir Lead, Adiar (+3d), Ignorar.
- `Snooze` e `Ignore` persistem em `localStorage`:
  - Chave `crm_suggestions_snoozed`: mapa `{ "leadId:type": timestamp_ms }`.
  - Chave `crm_suggestions_ignored`: array de chaves ignoradas.
- Reentrada: ao expirar o snooze, a sugestão reaparece automaticamente.
- Geração continua via `generateNextActionsForLeads` mas filtrada contra snooze/ignore.
- Ao clicar em Agendar, contexto básico é salvo em `sessionStorage.pre_schedule_context` para possível uso futuro em um modal de criação acelerada.

Benefícios:
- Kanban mostra apenas compromissos reais (reduz ruído visual).
- Sugestões têm espaço próprio e ações adequadas ao estágio (prospecção, nutrição, follow-up).
- Fácil futura evolução para analytics (taxa de conversão de sugestão para agendamento).

Próximas ideias:
1. Modal de agendamento rápido inline (sem navegar para calendar/new) consumindo `pre_schedule_context`.
2. Métrica “Sugestões convertidas hoje” no topo.
3. Botão “Reexibir tudo” (limpa ignore e snooze) para testes / auditoria.
4. Backend persistindo ignore/snooze para multi-dispositivo.

### Agendamento Rápido (QuickScheduleModal)
Novo fluxo para converter uma sugestão em compromisso sem sair do Dashboard:
- Componente: `QuickScheduleModal.jsx`.
- Aberto ao clicar em Agendar em uma sugestão.
- Pré-preenchimentos automáticos:
  - Tipo inferido pelo `suggestion.type` (visita, mensagem, email, ligar...
  - Título padrão contextual ("Agendar visita", "Enviar mensagem", etc.)
  - Início: próxima meia hora arredondada.
  - Duração padrão: 30 minutos (configurável).
  - Notas: descrição da sugestão.
- Salva via `appointmentService.saveAppointment`.
- Ao salvar: sug est ~ ignorada para não reaparecer (usa onSuggestionIgnore internamente) e o compromisso aparece no Kanban (coluna Pendente/Em andamento conforme regras).

Campos enviados:
- `title`, `type`, `start` ISO, `end` ISO (start + duração), `lead_id`, `property_id` (se existir), `description`, `status` (Pendente).

Possíveis melhorias futuras:
1. Seleção de imóvel se nenhum estiver associado.
2. Multi-horários sugeridos (chips) antes de abrir input manual.
3. Botão "Converter em proposta" direto se tipo = negociação.
4. Métrica de conversão (tempo entre sugestão gerada e agendamento criado).

---
