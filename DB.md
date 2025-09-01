# Prisma Implementation Overview

## **Database Architecture**

### **Schema Structure (5 Models)**

```prisma
User ←→ Card (creator/assignee relationships)
Board → Column → Card (hierarchical structure)
Activity ←→ User (user attribution for all actions)
```

**Key Design Decisions:**

- **CUID IDs** - Better than UUIDs for database performance
- **Cascade deletes** - When column deleted, cards auto-deleted
- **Position fields** - Integer ordering for drag & drop
- **Optional relationships** - Cards can be unassigned
- **Timestamps** - Auto `createdAt`/`updatedAt` tracking

## **File Structure**

```
kanban/
├── prisma/
│   ├── schema.prisma        # Database schema definition
│   └── dev.db              # SQLite database file
├── generated/prisma/        # Auto-generated TypeScript client
├── backend/src/
│   └── database.ts         # Prisma client & utilities
└── .env                    # DATABASE_URL config
```

## **What You Get From Prisma**

### **1. Type-Safe Database Operations**

```typescript
// All these are fully typed with autocomplete
const user = await prisma.user.create({...})
const cards = await prisma.card.findMany({...})
const board = await prisma.board.update({...})
```

### **2. Relationship Queries**

```typescript
// Get column with all its cards
const columnWithCards = await prisma.column.findUnique({
  where: { id: columnId },
  include: { cards: true },
});

// Get user with assigned and created cards
const userWithCards = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    assignedCards: true,
    createdCards: true,
  },
});
```

### **3. Built-in Query Operations**

- `create()`, `findMany()`, `findUnique()`
- `update()`, `delete()`, `upsert()`
- `count()`, `aggregate()`, `groupBy()`
- Filtering, sorting, pagination built-in

## **Current Capabilities**

**✅ Ready to use:**

- Database connection established
- All tables created
- TypeScript client generated
- Test utilities available (`npm run test:db`)
- All API endpoints protected by authentication (Clerk)

**🎯 Perfect for Kanban needs:**

- Card positioning for drag & drop
- User assignment system
- Dynamic columns
- Priority levels (HIGH/MEDIUM/LOW)
- Rich relationships between entities
- **Activity logging and real-time collaboration**
- **User presence and collaboration tracking**

## **✅ REST API Implementation Complete (Auth-protected)**

### **All CRUD Endpoints Working**

**Boards Management:**

- `GET /api/boards` - List all boards
- `POST /api/boards` - Create new board
- `GET /api/boards/:id` - Get board with columns & cards
- `PUT /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

**Columns Management:**

- `POST /api/boards/:id/columns` - Create column in board
- `PUT /api/columns/:id` - Update column (title, position)
- `DELETE /api/columns/:id` - Delete column
- `POST /api/columns/:id/reorder` - Reorder columns

**Cards Management:**

- `POST /api/columns/:id/cards` - Create card in column
- `GET /api/cards/:id` - Get card details
- `PUT /api/cards/:id` - Update card (title, description, priority, assignee)
- `DELETE /api/cards/:id` - Delete card
- `POST /api/cards/:id/move` - Move card between columns

All requests must include an `Authorization: Bearer <token>` header from Clerk.

**Users:**

- `GET /api/users` - List users for assignment
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user with cards
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### **Advanced Features Implemented**

**Position Management:**

- Automatic position calculation for new items
- Position recalculation when reordering
- Proper handling of item positions to support drag & drop in the UI (when enabled)

**Relationship Handling:**

- Cards properly linked to columns and users
- Efficient nested queries (board → columns → cards)
- Cascade delete protection where appropriate

**Error Handling:**

- Portuguese error messages
- Proper HTTP status codes
- Validation for required fields and relationships

**Type Safety:**

- Complete TypeScript integration
- Request/response type definitions
- Database operation safety

### **API Structure**

```
backend/src/
├── routes/
│   ├── boards.ts     # Board CRUD operations
│   ├── columns.ts    # Column management & reordering
│   ├── cards.ts      # Card CRUD & movement logic
│   └── users.ts      # User management
├── middleware/
│   └── errorHandler.ts # Error handling & validation
├── types/
│   └── api.ts        # Request/response type definitions
└── index.ts          # Server setup with all routes
```

### **Authentication**

- `GET /api/auth/me` — Returns the authenticated local user (created/upserted via Clerk).

### **Testing Infrastructure**

**Test Database:**

- **Location**: `prisma/test.db` (separate from development database)
- **Environment**: Uses `.env.test` configuration
- **Auto-cleanup**: Database cleaned between each test execution
- **Schema**: Identical to development database

**Test Coverage:**

- All CRUD operations tested across all models
- Authentication middleware verification
- Database connection and error handling
- Position management for drag & drop operations

**Running Database Tests:**

```bash
npm run test:db       # Test database connection
npm run test:backend  # Run all backend tests (includes database tests)
```

### **Example Usage**

```typescript
// Create user
POST /api/users
{ "name": "João Silva", "email": "joao@test.com" }

// Create board
POST /api/boards
{ "title": "Meu Projeto", "description": "Projeto de exemplo" }

// Create column
POST /api/boards/{boardId}/columns
{ "title": "A Fazer" }

// Create card
POST /api/columns/{columnId}/cards
{
  "title": "Primeira tarefa",
  "description": "Descrição da tarefa",
  "priority": "HIGH"
}

// Move card between columns
POST /api/cards/{cardId}/move
{ "columnId": "{newColumnId}", "position": 0 }
```

All curl examples require auth, for example:

```bash
curl -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Meu Projeto"}' \
  http://localhost:3001/api/boards
```

### **Server Status**

- ✅ Development server ready (`npm run dev:backend`)
- ✅ All endpoints tested and working
- ✅ Error handling verified
- ✅ Position management confirmed
- ✅ Integrated with frontend (v0.3.0+); powering full CRUD in the UI
