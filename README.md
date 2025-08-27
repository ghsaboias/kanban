# Sistema de Quadro Kanban

Uma aplicação colaborativa de quadro Kanban construída com React, TypeScript e Express.

## Stack Técnico

### Frontend
- **Vite + React + TypeScript** - Desenvolvimento rápido e segurança de tipos

### Backend
- **Express + TypeScript** - Servidor de API

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

3. Inicie os servidores de desenvolvimento:
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
├── frontend/          # Frontend React + Vite
├── backend/           # Servidor de API Express
├── shared/           # Tipos TypeScript compartilhados
├── package.json      # Configuração do workspace
└── README.md         # Este arquivo
```

## Endpoints da API

- `GET /api/health` - Endpoint de verificação de saúde
