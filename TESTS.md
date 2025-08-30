# Tests

This document explains how tests are organized and run in this monorepo, what’s currently covered, known gaps, and how to extend coverage safely.

## Quick Start

- All tests: `npm test`
- Backend only: `npm run test:backend`
- Frontend only: `npm run test:frontend`
- Coverage (backend + frontend): `npm run test:coverage`
- Watch mode (both): `npm run test:watch`

Frontend coverage is enabled via `@vitest/coverage-v8`.

## Repository Layout

- `backend/src/__tests__/`
  - `auth/clerk.test.ts` — ensureUser middleware
  - `database.test.ts` — Prisma connection, CRUD, relations, constraints
  - `middleware/errorHandler.test.ts` — AppError, errorHandler, asyncHandler, notFound
  - `routes/boards.test.ts` — Boards REST endpoints
  - `setup.ts` — loads `.env.test`, connects Prisma, truncates tables before each test
- `backend/jest.config.js` — Jest configuration
- `frontend/src/__tests__/`
  - `api.test.ts` — API client behavior
  - `components/Board.test.tsx` — Board component states/interactions (active)
  - `setup.ts` — jsdom setup + mocks (fetch, socket.io-client, Clerk)
- `frontend/vitest.config.ts` — Vitest configuration

## Backend Tests (Jest)

- Runner: Jest 29 with `ts-jest`.
- HTTP: `supertest` against the Express app instance (no real server listen).
- DB: Prisma client from `generated/` using `.env.test` (SQLite).
- Auth: Clerk middleware is mocked where required.

Key configuration:
- `roots: ["<rootDir>/src"]` and `testMatch: **/__tests__/**/*.test.ts`.
- `setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"]` handles Prisma connect/disconnect and DB cleanup (delete in order: card → column → board → user).
- `maxWorkers: 1` prevents parallel test interference with the shared test DB.

Current coverage focus:
- Error utilities: `AppError`, `errorHandler`, `asyncHandler`, `notFound`.
- Clerk integration: `ensureUser` creates/updates local users from Clerk data.
- Database sanity: connection, CRUD, relations, unique constraints, cascades.
- Boards REST API: GET (list/detail), POST, PUT, DELETE with validation and ordering.

Coverage notes:
- Summary file after runs: `backend/coverage/coverage-summary.json`.
- Temporarily ignored to keep baseline signal clean: `src/socket/*`, `src/routes/cards.ts`, `src/routes/columns.ts`, `src/routes/users.ts`.
- To raise coverage, add tests for the ignored paths and remove them from `coveragePathIgnorePatterns` in `backend/jest.config.js`.

Tips:
- Use `request(app)` with `supertest` (do not call `app.listen`).
- Keep DB cleanup in `beforeEach`; avoid reusing state across tests.
- When mocking Clerk, stub `withAuth`, `requireAuthMw`, and provide `res.locals.user` as needed.

## Frontend Tests (Vitest)

- Runner: Vitest 3 with jsdom and React Testing Library.
- Setup: `frontend/src/__tests__/setup.ts` mocks `global.fetch`, `socket.io-client`, and `@clerk/clerk-react` to avoid real network/auth.
- API client: `frontend/src/api.ts` provides `api.request/get/post/put/delete` used by tests, merging auth and socket headers and handling JSON responses, 204 nulls, and error propagation.

What’s covered:
- `src/__tests__/api.test.ts` — end-to-end API client behavior (headers, body serialization, success/error handling, JSON parse errors, empty responses).
- `src/__tests__/components/Board.test.tsx` — Board rendering, loading/error states, column/card presence, basic DnD context, and add‑column flow (with mocks).

Known gaps:
- Pages: `BoardsList.tsx`, `BoardPage.tsx` do not have tests yet (navigation, empty/error states, create board flow).
- Realtime and DnD: interactions beyond the basic mocked context (e.g., invoking `onDragEnd` and socket event reactions) are not covered.
- Rich card details: `CardDetailModal.tsx`, `RichTextEditor.tsx` and socket hooks are largely untested.

Frontend coverage:
- Coverage is already enabled with `@vitest/coverage-v8`. Run `npm run test:coverage` from the repo root.

## Current Coverage (summary)

- Backend (Jest): Lines 92.9%, Statements 92.81%, Branches 86.66%, Functions 84.21%.
- Frontend (Vitest, src only): Lines ~44.34%, Statements ~44.34%, Branches ~84.61%, Functions ~77.77%.

Tips:
- Avoid JSX in the `.ts` test setup; return `null` from mocked components.
- Prefer queries by role/text over internal test ids when possible.
- Ensure mocks match the actual hooks (e.g., `useApi` function vs. client object).

## Environment & DB

- `backend/.env.test` should configure the Prisma test database (SQLite). The test setup connects/disconnects Prisma and truncates tables before each test in FK-safe order.
- No real network calls are performed by tests (frontend fetch/socket are mocked; backend uses in-memory Express via `supertest`).

## Planned Improvements

- Re-enable and update Board component tests to match current UI (English strings, hook shape, realistic queries).
- Add coverage for: `src/routes/columns.ts`, `src/routes/cards.ts`, `src/routes/users.ts`, and `src/socket/*`.
- Enable frontend coverage in CI after installing `@vitest/coverage-v8`.

## Troubleshooting

- EPERM / port binding errors in backend tests: ensure you use `request(app)` (no server listen) and keep Jest `maxWorkers: 1`.
- TypeScript errors in tests: ensure tests compile with project tsconfigs; avoid JSX in `.ts` setup files.
- Missing frontend coverage: install `@vitest/coverage-v8` as shown above.
