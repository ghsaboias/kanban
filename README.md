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
- **Sistema de posicionamento** - Suporte nativo para drag & drop
- **Middleware de erros** - Tratamento de erros em português

### Banco de Dados
- **4 Modelos principais**: User, Board, Column, Card
- **Relacionamentos completos**: Usuários podem ser atribuídos a cards
- **Sistema de posições**: Ordenação automática para drag & drop
- **IDs seguros**: CUID para melhor performance e segurança

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

# backend/.env.local
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

### Desenvolvimento Individual

Para executar frontend e backend separadamente:

```bash
# Apenas frontend
npm run dev:frontend

# Apenas backend  
npm run dev:backend
```

## Estrutura do Projeto

```
kanban/
├── frontend/          # Frontend React + Vite + TypeScript
├── backend/           # API REST Express + TypeScript
│   ├── src/
│   │   ├── routes/    # Rotas CRUD (boards, columns, cards, users)
│   │   ├── middleware/# Tratamento de erros
│   │   ├── types/     # Tipos TypeScript da API
│   │   └── index.ts   # Servidor principal
├── prisma/           # Schema e banco SQLite
├── generated/        # Cliente Prisma auto-gerado
├── shared/          # Tipos TypeScript compartilhados (futuro)
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
npm run dev:backend   # Apenas Express (3001)
```

## Observações

- O diretório `generated/` (cliente Prisma) e o banco `prisma/dev.db` são gerados localmente e ignorados pelo Git.
- `postinstall` executa `prisma generate` automaticamente após `npm install`.

## Tecnologias

**Backend:** Express + TypeScript + Prisma + SQLite  
**Frontend:** Vite + React + TypeScript  
**Banco:** 4 modelos (User, Board, Column, Card) com relacionamentos

## Drag & Drop (dnd-kit)

- **Biblioteca**: `@dnd-kit/core` + `@dnd-kit/sortable` (ergonomia moderna, suporte mouse/touch/teclado, ótima para listas ordenáveis e múltiplos contêineres).
- **Escopo atual**: Reordenação de colunas e reordenação/movimentação de cards com persistência.
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

## Detalhes do Card (Modal)

- **Abertura**: clique no card abre um modal lateral com transição suave de 200ms (fade do backdrop + slide do painel).
- **Fechamento**: `Esc`, clique no backdrop, no “×” ou ao salvar. O conteúdo permanece montado por ~200ms para completar a animação, depois desmonta.
- **Edição**: título, descrição, prioridade e responsável com persistência via `PUT /api/cards/:id`.
- **Editor de texto rico**: descrições suportam formatação completa (negrito, itálico, títulos, listas, citações, links) via TipTap com sanitização HTML no backend.
- **Upload de imagens**: suporte a upload de imagens via base64 com preview em seções separadas e modal de visualização em tela cheia.
- **Acessibilidade**: travamos o scroll do `body` ao abrir; foco vai para o título.
- **Ergonomia**: o botão excluir do card é discreto (aparece somente no hover do card). No header da coluna, o contador é um “chip” neutro (com `99+`) e o botão de excluir coluna é separado por um divisor e destaca no hover.
