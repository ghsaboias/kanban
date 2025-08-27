# Kanban Board System

A collaborative Kanban board application built with React, TypeScript, and Express.

## Tech Stack

### Frontend
- **Vite + React + TypeScript** - Fast development and type safety

### Backend
- **Express + TypeScript** - API server

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ghsaboias/kanban
cd kanban
```

2. Install dependencies:
```bash
npm install
```

3. Start development servers:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Individual Development

To run frontend and backend separately:

```bash
# Frontend only
npm run dev:frontend

# Backend only  
npm run dev:backend
```

## Project Structure

```
kanban/
├── frontend/          # React + Vite frontend
├── backend/           # Express API server
├── shared/           # Shared TypeScript types
├── package.json      # Workspace configuration
└── README.md         # This file
```

## API Endpoints

- `GET /api/health` - Health check endpoint
