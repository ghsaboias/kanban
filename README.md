# KanBrain 🧠

Uma aplicação colaborativa de quadro Kanban construída com React, TypeScript e Express. Sistema desenvolvido para uso interno em empresa do mercado financeiro, focado em flexibilidade, organização e atribuição eficiente de tarefas.

## Stack Técnico

### Frontend

- **Vite + React + TypeScript** - Desenvolvimento rápido e segurança de tipos
- Interface responsiva para criação dinâmica de colunas e cards
- **Drag & Drop com dnd-kit** (colunas já reordenáveis e persistidas)

### Backend

- **Express + TypeScript** - Servidor de API REST completo
- **Prisma ORM + SQLite** - Banco de dados com relacionamentos tipados
- **Socket.IO Server** - Servidor WebSocket para colaboração em tempo real
- **Sistema de posicionamento** - Suporte nativo para drag & drop
- **Middleware de erros** - Tratamento de erros em português
- **Activity Logger** - Sistema de logging e broadcasting de atividades

### Banco de Dados

- **5 Modelos principais**: User, Board, Column, Card, Activity
- **Relacionamentos completos**: Usuários podem ser atribuídos a cards
- **Sistema de posições**: Ordenação automática para drag & drop
- **IDs seguros**: CUID para melhor performance e segurança
- **Sistema de atividades**: Logging completo de todas as ações com atribuição de usuário

## Como Começar

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

1. Clone o repositório:

```bash
git clone https://github.com/ghsaboias/kanban
cd kanban
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente (Autenticação):

```bash
# frontend/.env.local
VITE_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_API_URL=http://localhost:3001

# backend/.env (ou use o .env da raiz ao rodar a partir dela)
DATABASE_URL=file:../prisma/dev.db
CLERK_SECRET_KEY=YOUR_SECRET_KEY
CORS_ORIGIN=http://localhost:5173
```

4. Configure o banco de dados:

```bash
# Gera o cliente Prisma
npm run db:generate

# Aplica o schema ao banco
npm run db:push

# Testa a conexão (opcional)
npm run test:db
```

5. Inicie os servidores de desenvolvimento:

```bash
npm run dev
```

Isso irá iniciar:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Build de Produção

Quer testar a performance com o bundle otimizado? Use o fluxo abaixo.

1) Variáveis de ambiente (recomendado)

- Backend (carregado a partir da raiz): crie/edite `.env` na raiz com:
  - `DATABASE_URL=file:./prisma/dev.db`
  - `CLERK_SECRET_KEY=<seu_secret_key>`
  - `CLERK_PUBLISHABLE_KEY=<seu_publishable_key>`
  - `CORS_ORIGIN=http://localhost:5173`
- Frontend (lidas no build pela Vite): `frontend/.env.local`
  - `VITE_CLERK_PUBLISHABLE_KEY=<seu_publishable_key>`
  - `VITE_API_URL=http://localhost:3001`

2) Gerar os artefatos de produção (monorepo inteiro)

```bash
npm run build
```

3) Subir o backend (produção)

```bash
NODE_ENV=production PORT=3001 node backend/dist/index.js
```

4) Servir o frontend gerado e abrir no navegador

Opção A (recomendado):

```bash
npm run serve:prod
# Acesse: http://localhost:5173
```

Opção B (alternativa estática):

```bash
cd frontend/dist
python3 -m http.server 5173
# Acesse: http://localhost:5173
```

Observações importantes:
- `npm run dev` usa servidores com HMR/watchers (rápido para desenvolvimento).
- `npm run build` gera artefatos otimizados: `frontend/dist` (Vite) e `backend/dist` (TypeScript compilado).
- Para o frontend em produção funcionar, o `VITE_API_URL` precisa apontar para o backend em execução.
- Se aparecer erro de CORS no navegador, confira `CORS_ORIGIN=http://localhost:5173` no `.env` e reinicie o backend.

### Sobre variáveis de ambiente (evitando duplicação)

- Backend: como o servidor carrega `dotenv` a partir do diretório atual, recomenda-se manter o arquivo `.env` apenas na raiz e iniciar o backend a partir dela (ex.: `node backend/dist/index.js`). Isso evita ter de manter `backend/.env.local` duplicado.
- Frontend: mantenha as variáveis `VITE_*` em `frontend/.env.local` (ou `.env` dentro de `frontend/`). Vite lê apenas arquivos do próprio pacote e somente variáveis que começam com `VITE_` entram no bundle.
- Opcional: se preferir rodar o backend estando dentro de `backend/`, crie `backend/.env` (não `.env.local`) com as mesmas chaves do `.env` da raiz.

### Desenvolvimento Individual

Para executar frontend e backend separadamente:

```bash
# Apenas frontend
npm run dev:frontend

# Apenas backend
npm run dev:backend
```

### Executar Pacotes Individualmente (a partir da raiz)

```bash
# Frontend
npm run -w frontend dev
npm run -w frontend build
npm run -w frontend preview -- --port 5173

# Backend
npm run -w kanban-backend dev
npm run -w kanban-backend build
NODE_ENV=production node backend/dist/index.js
```

## Estrutura do Projeto

```
kanban/
├── frontend/          # Frontend React + Vite + TypeScript
│   ├── src/
│   │   ├── components/ # Componentes React (Board, Card, Column, ActivityFeed)
│   │   ├── hooks/      # Hooks customizados (useSocket, useRealtimeBoard)
│   │   ├── contexts/   # Context providers (SocketContext)
│   │   └── types/      # Tipos TypeScript do frontend
├── backend/           # API REST Express + TypeScript
│   ├── src/
│   │   ├── routes/    # Rotas CRUD (boards, columns, cards, users)
│   │   ├── middleware/# Tratamento de erros
│   │   ├── services/  # Serviços (ActivityLogger)
│   │   ├── socket/    # Socket.IO handler e autenticação
│   │   ├── types/     # Tipos TypeScript da API
│   │   └── index.ts   # Servidor principal
├── prisma/           # Schema e banco SQLite (5 modelos)
├── generated/        # Cliente Prisma auto-gerado
├── shared/          # Tipos TypeScript compartilhados para real-time collaboration (realtime.ts)
└── package.json     # Configuração do workspace
```

## API REST Completa

Todas as rotas exigem autenticação (Clerk). Adicione o header `Authorization: Bearer <token>`.

### Boards (Quadros)

```bash
GET    /api/boards          # Lista todos os boards
POST   /api/boards          # Cria novo board
GET    /api/boards/:id      # Obtém board com colunas e cards
PUT    /api/boards/:id      # Atualiza board
DELETE /api/boards/:id      # Remove board
```

### Columns (Colunas)

```bash
POST   /api/boards/:id/columns    # Cria coluna no board
PUT    /api/columns/:id           # Atualiza coluna
DELETE /api/columns/:id           # Remove coluna
POST   /api/columns/:id/reorder   # Reordena colunas
```

### Cards (Tarefas)

```bash
POST   /api/columns/:id/cards     # Cria card na coluna (createdById é derivado do usuário autenticado)
GET    /api/cards/:id             # Obtém detalhes do card
PUT    /api/cards/:id             # Atualiza card
DELETE /api/cards/:id             # Remove card
POST   /api/cards/:id/move        # Move card entre colunas
```

### Users (Usuários)

```bash
GET    /api/users          # Lista usuários
POST   /api/users          # Cria usuário
GET    /api/users/:id      # Obtém usuário com cards
PUT    /api/users/:id      # Atualiza usuário
DELETE /api/users/:id      # Remove usuário
```

### Health Check

```bash
GET    /api/health         # Status do servidor
```

## Exemplos de Uso da API

### Criar um usuário

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "João Silva", "email": "joao@empresa.com"}'
```

### Criar um board (com auth)

```bash
curl -X POST http://localhost:3001/api/boards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Projeto Sprint 1", "description": "Desenvolvimento da API"}'
```

### Criar uma coluna

```bash
curl -X POST http://localhost:3001/api/boards/{boardId}/columns \
  -H "Content-Type: application/json" \
  -d '{"title": "A Fazer"}'
```

### Criar um card (com auth)

```bash
curl -X POST http://localhost:3001/api/columns/{columnId}/cards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implementar autenticação",
    "description": "Integrar Clerk para controle de acesso",
    "priority": "HIGH"
  }'
```

### Mover card entre colunas

```bash
curl -X POST http://localhost:3001/api/cards/{cardId}/move \
  -H "Content-Type: application/json" \
  -d '{"columnId": "{newColumnId}", "position": 0}'
```

### Autenticação (Clerk)

- Frontend: App envolve `ClerkProvider` e as chamadas de API usam token via hook `useApi()`.
- Backend: `@clerk/express` protege `/api/*` e sincroniza usuário local via upsert (`ensureUser`).
- Endpoint de bootstrap: `GET /api/auth/me` (retorna o usuário local autenticado).

## Comandos de Desenvolvimento

```bash
# Database
npm run db:generate    # Regenera cliente Prisma
npm run db:push        # Atualiza schema no banco
npm run test:db        # Testa conexão

# Desenvolvimento
npm run dev           # Inicia frontend + backend
npm run dev:frontend  # Apenas React (5173)
npm run dev:backend   # Apenas backend

# Testes
npm test              # Executa todos os testes (backend + frontend)
npm run test:backend  # Testes do backend apenas
npm run test:frontend # Testes do frontend apenas
npm run test:watch    # Executa testes em modo watch
```

## Testes

O projeto inclui testes automatizados para garantir a qualidade do código:

### Estrutura de Testes

- **Backend**: Jest com Supertest para testes de API
- **Frontend**: Vitest com React Testing Library para testes de componentes
- **Database**: SQLite separado para testes (`test.db`)

### Executando Testes

```bash
npm test                    # Todos os testes
npm run test:backend        # Apenas backend (API routes, database, auth)
npm run test:frontend       # Apenas frontend (components, hooks)
npm run test:watch          # Modo watch para desenvolvimento
```

### Cobertura Atual

- **Total**: 243 testes passando
- **Backend**: 157 testes (rotas API, autenticação, database)
- **Frontend**: 86 testes (componentes, hooks, performance)

Os testes cobrem funcionalidades essenciais incluindo CRUD operations, autenticação, drag & drop, e real-time features.

## Observações

- O diretório `generated/` (cliente Prisma) e o banco `prisma/dev.db` são gerados localmente e ignorados pelo Git.
- `postinstall` executa `prisma generate` automaticamente após `npm install`.
- Banco de testes (`test.db`) é limpo automaticamente entre execuções.

## Tecnologias

**Backend:** Express + TypeScript + Prisma + SQLite  
**Frontend:** Vite + React + TypeScript  
**Banco:** 4 modelos (User, Board, Column, Card) com relacionamentos

## Drag & Drop (dnd-kit) e Gerenciamento de Estado Entre Colunas

- **Biblioteca**: `@dnd-kit/core` + `@dnd-kit/sortable` (ergonomia moderna, suporte mouse/touch/teclado, ótima para listas ordenáveis e múltiplos contêineres).
- **Escopo atual**: Reordenação de colunas e reordenação/movimentação de cards com persistência.
- **Gerenciamento de Estado Entre Colunas**:
  - Cada coluna mantém seu próprio array de cards ordenado por posição
  - Quando um card é movido para outra coluna, sua posição é recalculada automaticamente
  - O estado é gerenciado de forma otimista: a UI atualiza imediatamente, depois sincroniza com o servidor
  - Em caso de falha na API, o estado anterior é restaurado para manter a consistência da UI
- **Como funciona**:
  - `DndContext` e `SortableContext` em `Board.tsx` (colunas: horizontal; cards: vertical em cada coluna).
  - Colunas: `SortableColumn` (`Sortable`) com ids `column-<id>`.
  - Cards: `SortableCard` (`Sortable`) com ids `card-<id>` e coluna droppable `column-<id>` para suportar drop em colunas vazias.
  - Sensor: `PointerSensor` com `activationConstraint: { distance: 8 }` para evitar que cliques sejam consumidos pelo início do drag (um clique sempre abre o modal do card).
  - Em `onDragEnd`, distinguimos colunas vs cards pelos prefixos, aplicamos atualização otimista e normalizamos `position` (0..N-1).
  - Persistência via API:
    - Colunas: `POST /api/columns/:id/reorder { position }`.
    - Cards (mesma coluna): `PUT /api/cards/:id { position }`.
    - Cards (entre colunas): `POST /api/cards/:id/move { columnId, position }`.
  - Falha na API → rollback do estado anterior e mensagem no console (UI permanece consistente).

### Endpoints usados na persistência

- Reordenar coluna: `POST /api/columns/:id/reorder` com `{ position }`.
- Reordenar card: `PUT /api/cards/:id` com `{ position }`.
- Mover card: `POST /api/cards/:id/move` com `{ columnId, position }`.

### Decisão técnica

- Preferimos dnd-kit a alternativas (React DnD, @hello-pangea/dnd) por flexibilidade, acessibilidade e suporte nativo a múltiplos sensores. O PRD incentiva uso de bibliotecas prontas.

## Sistema de Colaboração em Tempo Real

### **Socket.IO Implementation**

- **Servidor WebSocket**: Integrado ao Express com autenticação Clerk
- **Rooms por Board**: Comunicação isolada entre projetos diferentes
- **Eventos em Tempo Real**: 15+ tipos de eventos para todas as operações
- **Autenticação Segura**: Handshake autenticado com tokens Clerk

### **Eventos Implementados**

- **Presença de Usuários**: `user:joined`, `user:left` com roster atualizado
- **Operações de Cards**: `card:created`, `card:updated`, `card:deleted`, `card:moved`
- **Operações de Colunas**: `column:created`, `column:updated`, `column:deleted`, `column:reordered`
- **Sistema de Atividades**: `activity:created` para todas as ações

### **Activity Feed System**

- **Logging Completo**: Todas as ações são registradas com metadados
- **Broadcasting em Tempo Real**: Atividades aparecem instantaneamente para todos os usuários
- **Atribuição de Usuário**: Cada ação é vinculada ao usuário que a executou
- **Interface Portuguesa**: Feed de atividades localizado com timestamps relativos

### **User Presence & Collaboration**

- **Roster em Tempo Real**: Mostra quem está atualmente visualizando cada board
- **Notificações de Presença**: Join/leave events para colaboração
- **Isolamento por Board**: Usuários só veem presença no board atual
- **Gerenciamento de Estado**: Presença limpa automaticamente em desconexões

### **Otimizações de Performance**

- **Atualizações Otimistas**: UI responde imediatamente, sincroniza com servidor
- **Deduplicação de Eventos**: Previne duplicatas com `X-Socket-Id` header
- **Batch Processing**: Atividades processadas em lotes para eficiência
- **Reconexão Automática**: Recuperação automática de falhas de conexão

## Próximos Passos para Melhorar a Aplicação

Se houvesse mais tempo para desenvolvimento, as próximas prioridades seriam:

- **Notificações em Tempo Real**: Sistema de notificações para mencionar usuários em comentários e updates
- **Comentários nos Cards**: Sistema de comentários thread para discussões por tarefa
- **Templates de Quadro**: Templates pré-configurados para diferentes tipos de projetos
- **Relatórios e Analytics**: Dashboard com métricas de produtividade e tempo de ciclo
- **Integração com Ferramentas Externas**: Conexão com ferramentas como Slack, Jira, ou Google Calendar
- **Modo Offline**: Funcionalidade offline com sincronização quando reconectado
- **Mobile App**: Aplicativo móvel nativo ou PWA para acesso em dispositivos móveis
- **Custom Fields**: Campos personalizáveis nos cards além do título, descrição e prioridade

## Detalhes do Card (Modal)

- **Abertura**: clique no card abre um modal lateral com transição suave de 200ms (fade do backdrop + slide do painel).
- **Fechamento**: `Esc`, clique no backdrop, no “×” ou ao salvar. O conteúdo permanece montado por ~200ms para completar a animação, depois desmonta.
- **Edição**: título, descrição, prioridade e responsável com persistência via `PUT /api/cards/:id`.
- **Editor de texto rico**: descrições suportam formatação completa (negrito, itálico, títulos, listas, citações, links) via TipTap com sanitização HTML no backend.
- **Upload de imagens**: suporte a upload de imagens via base64 com preview em seções separadas e modal de visualização em tela cheia.
- **Acessibilidade**: travamos o scroll do `body` ao abrir; foco vai para o título.
- **Ergonomia**: o botão excluir do card é discreto (aparece somente no hover do card). No header da coluna, o contador é um "chip" neutro (com `99+`) e o botão de excluir coluna é separado por um divisor e destaca no hover.

## Justificativa das Tecnologias

### Contexto: Ferramenta Interna para Mercado Financeiro

As escolhas técnicas priorizaram **agilidade de desenvolvimento** e **confiabilidade** para uma solução sob medida, seguindo o princípio "não reinvente a roda" mencionado nos requisitos.

### Frontend

- **React + Vite + TypeScript**: Desenvolvimento rápido com HMR instantâneo e prevenção de erros em tempo de compilação
- **dnd-kit**: Drag & drop com melhor performance que React DnD para reorganização fluida de tarefas
- **TipTap**: Editor rich text baseado em ProseMirror, com controle específico sobre elementos HTML permitidos
- **Socket.IO Client**: Comunicação real-time confiável com reconexão automática

### Backend

- **Express + TypeScript**: Framework direto que acelera iteração com validação de tipos
- **Prisma + SQLite**: ORM com queries type-safe. SQLite elimina setup de banco externo para ferramenta interna
- **Socket.IO**: WebSocket com rooms isolados por board, evitando vazamento de dados entre projetos
- **Clerk**: Autenticação gerenciada externamente, removendo responsabilidade de implementar/manter segurança de senhas

### Segurança Implementada

- **HTML Sanitization**: `sanitize-html` com lista específica de tags permitidas (p, strong, em, ul, li, img), bloqueando `javascript:` e `<script>` automaticamente
- **Authentication Middleware**: Todas rotas `/api/*` exigem token válido do Clerk; usuários são sincronizados via upsert race-safe
- **Link Protection**: Links externos forçam `target="_blank" rel="noopener noreferrer"` para prevenir window.opener exploits
- **Image Upload**: Suporte apenas a data URLs (base64) para evitar referências externas não autorizadas

## Pipeline de CI/CD

### Estratégia Implementada

**Workflow Automatizado:**

- Validação automática em Pull Requests para `master`
- Testes executam em ambiente isolado GitHub Actions
- Merge bloqueado se qualquer verificação falhar

**Etapas da Pipeline:**

1. **Instalação de Dependências**

   ```yaml
   - Instala dependências do monorepo (backend + frontend)
   - Cache inteligente para acelerar builds subsequentes
   ```

2. **Verificações de Qualidade** (Paralelas)

   ```yaml
   - Lint: npm run lint (ESLint frontend + backend)
   - TypeCheck: npm run typecheck (TypeScript compilation)
   - Tests: npm test (243 testes automatizados)
   ```

3. **Proteções de Branch**
   ```yaml
   - Todas as verificações devem passar para merge
   - Pelo menos 1 aprovação de revisor necessária
   - Branch deve estar atualizada com master
   ```

**Comandos Disponíveis:**

```bash
npm run lint      # ESLint: 0 erros, 113 warnings (apenas any types)
npm run typecheck # TypeScript: compilação limpa
npm test          # 243 testes: 157 backend + 86 frontend
```

**Benefícios:**

- **Prevenção de bugs**: Código quebrado não chega ao master
- **Consistência**: Estilo e qualidade padronizados
- **Confiabilidade**: 243 testes garantem funcionalidade
- **Velocidade**: Validação automática em ~3-5 minutos
