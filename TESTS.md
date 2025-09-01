# Testing Guide

This document provides comprehensive information on the testing setup and how to run tests in the Kanban project.

## Test Infrastructure

### Architecture
- **Backend**: Jest with Supertest for API testing
- **Frontend**: Vitest with React Testing Library for component testing
- **Database**: SQLite with separate test database
- **Coverage**: Integrated coverage reporting with custom summary script

### Directory Structure
```
kanban/
├── backend/src/__tests__/          # Backend tests
│   ├── setup.ts                    # Jest test setup
│   ├── auth/clerk.test.ts          # Authentication tests
│   ├── middleware/                 # Middleware tests
│   ├── routes/                     # API endpoint tests
│   └── utils/                      # Utility function tests
├── frontend/src/__tests__/         # Frontend tests
│   ├── api.test.ts                 # API utility tests
│   └── components/                 # Component tests
├── scripts/coverage.mjs            # Custom coverage reporter
└── TESTS.md                        # This file
```

## Environment Setup

### Backend Test Environment
- **Configuration**: `backend/.env.test` (not tracked in git)
- **Database**: Uses separate test database (`../prisma/test.db`)
- **Environment**: `NODE_ENV=test`
- **Note**: The `.env.test` file is automatically ignored by git for security

### Test Database
- **Location**: `prisma/test.db`
- **Auto-cleanup**: Database is cleaned between each test
- **Schema**: Shares the same schema as development database

## Running Tests

### Root (Monorepo) Commands

**Run all tests (backend + frontend):**
```bash
npm test
```

**Individual test suites:**
```bash
npm run test:backend        # Backend tests only
npm run test:frontend       # Frontend tests only
```

**Coverage reports:**
```bash
npm run test:coverage       # Full coverage with banners + summary
npm run test:backend:coverage    # Backend coverage only  
npm run test:frontend:coverage   # Frontend coverage only
```

**Watch mode:**
```bash
npm run test:watch          # Watch both backend and frontend
```

### Backend Commands (from backend/)

```bash
npm test                    # Run all backend tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage
```

### Frontend Commands (from frontend/)

```bash
npm test                    # Run all frontend tests
npm run test:ui             # Open Vitest UI (interactive)
npm run test:coverage       # Run tests with coverage
```

## Test Configuration

### Backend (Jest)
- **Config**: `backend/jest.config.js`
- **Environment**: Node.js
- **Workers**: Sequential execution (`maxWorkers: 1`) to avoid database races
- **Timeout**: 10 seconds per test
- **Setup**: Automatic database cleanup between tests

### Frontend (Vitest)  
- **Config**: `frontend/vitest.config.ts`
- **Environment**: jsdom (browser simulation)
- **Coverage**: v8 provider
- **Testing Library**: React Testing Library for component testing

## Test Statistics

### Current Test Coverage
- **Total Tests**: 243 tests passing
- **Backend**: 157 tests (API routes, database operations, authentication)
- **Frontend**: 86 tests (components, hooks, performance scenarios)

### Test Scope
**Backend tests cover:**
- All CRUD API endpoints (boards, columns, cards, users)
- Authentication middleware and Clerk integration
- Database connections and cleanup
- Activity logging and realtime features
- Error handling and validation

**Frontend tests cover:**
- Core components (Board, Column, Card, BoardsList)
- React hooks (useApi, useSocket)
- Performance scenarios with large datasets
- Context providers and routing

## Writing Tests

### Backend API Tests
```typescript
import request from 'supertest'
import { app } from '../../app'
import { testPrisma } from '../setup'

describe('Boards API', () => {
  it('should create a board', async () => {
    const response = await request(app)
      .post('/api/boards')
      .send({ title: 'Test Board' })
      .expect(201)
      
    expect(response.body.success).toBe(true)
  })
})
```

### Frontend Component Tests
```typescript
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { BoardsList } from '../../components/BoardsList'

describe('BoardsList', () => {
  it('renders boards after loading', async () => {
    render(
      <BrowserRouter>
        <BoardsList />
      </BrowserRouter>
    )
    
    expect(screen.getByText('Loading boards...')).toBeInTheDocument()
  })
})
```

## Test Database Management

### Automatic Cleanup
- **Before each test**: All tables are cleared in proper order (respecting foreign keys)
- **Setup**: Database connection established
- **Teardown**: Connection properly closed

### Manual Database Operations
```bash
npm run test:db            # Test database connection
npm run db:push            # Update database schema  
npm run db:generate        # Regenerate Prisma client
```

## Troubleshooting

### Common Issues

**Tests fail when run from monorepo root but pass from subdirectories:**
- **Cause**: Database path resolution issues
- **Solution**: Ensure `.env.test` uses correct relative paths (`../prisma/test.db`)

**Database connection errors:**
- **Check**: Database file exists in `prisma/` directory
- **Verify**: `.env.test` points to correct database path
- **Regenerate**: Run `npm run db:generate` if schema changed

**Frontend tests fail with "apiFetch is not a function":**
- **Cause**: Mock setup incorrect for `useApi` hook
- **Solution**: Mock should return function directly, not wrapped in object

### Performance Tips

- Backend tests run sequentially to avoid database race conditions
- Use `--watch` mode for development to run only changed tests
- Frontend tests use jsdom which is faster than real browser testing

## Environment Files

### .env.test Security Analysis

**Current contents:**
```bash
DATABASE_URL="file:../prisma/test.db"
NODE_ENV=test
```

**Security Assessment**: ✅ **Safe to track in git**
- Contains only test database path (local SQLite file)
- No secrets, API keys, or sensitive credentials
- Environment is clearly marked as `test`
- Database path is relative and non-sensitive

**Recommendation**: Unlike production `.env` files, `.env.test` could be tracked in git since it contains no sensitive information and would help ensure consistent test environments across developers.

## Coverage Reports

## Test Quality

The test suite provides confidence in core functionality:
- **API reliability**: All endpoints tested with various scenarios
- **Database integrity**: Automatic cleanup prevents test pollution
- **Component behavior**: User interactions and state changes verified
- **Performance validation**: Large dataset handling tested
- **Authentication flows**: Clerk integration and token handling verified

Tests run automatically in CI/CD and can be executed locally during development.