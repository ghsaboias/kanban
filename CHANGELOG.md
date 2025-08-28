# Changelog

All notable changes to this Kanban project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Card detail modal with 200ms open/close transition (backdrop fade + panel slide), Escape-to-close, body scroll lock, and focus management.
- Reliable click-to-open for cards by using dnd-kit `PointerSensor` with distance activation.
- UI: Neutral counter chip in column headers with `99+` cap and divider separating destructive actions.

### Changed
- Column header controls: delete column button now an icon button (trash), neutral by default and red on hover; counter is visually de-emphasized.
- Card delete affordance: smaller (20px), appears on card hover, neutral by default and red on hover to reduce visual competition with column-level actions.

### Fixed
- Intermittent card clicks not opening modal by switching from delay-based to distance-based drag activation.

## [0.5.0] - 2025-08-28

### Added - Phase 5: Drag & Drop Implementation
- Drag & drop (dnd-kit) for columns and cards
  - Columns: horizontal `SortableContext` with persistence via `POST /api/columns/:id/reorder { position }`.
  - Cards: per-column vertical `SortableContext` with same-column reorder via `PUT /api/cards/:id { position }` and cross-column move via `POST /api/cards/:id/move { columnId, position }`.
  - ID scheme to avoid collisions: `column-<id>`, `card-<id>`.
- DragOverlay for smooth cross-column dragging.
- Text contrast accessibility improvements (replaced #999, #666, #888 with darker colors)

### Fixed
- Eliminated mid-drag snap-back by rendering a `DragOverlay` and hiding the in-place item while dragging.
- Adjusted TypeScript imports to `import type { ... }` to comply with `verbatimModuleSyntax`.
- Improved text contrast for better accessibility compliance

### Docs
- README: Documented DnD approach, ids, and persistence endpoints.
- PLAN: Marked columns DnD done; set next focus; noted cards DnD completion.
- CLAUDE: Added DnD implementation tips and updated type-check commands.

## [0.4.0] - 2025-08-28

### Added - Phase 4: Complete CRUD Operations
- **Board Management**: Full create, read, update, delete functionality
  - Create board form with title and description validation
  - Edit board functionality with pre-populated form
  - Delete board with confirmation dialog and loading states
  - Edit/delete buttons with proper positioning and styling
- **Column Management**: Dynamic column operations with position handling
  - Create column with inline "Add Column" button
  - Edit column title by clicking (inline editing with Enter/Escape)
  - Delete column with validation (prevents deletion if cards exist)
  - Automatic position recalculation after column operations
- **Card Management**: Rich card operations with full metadata
  - Create card form with title, description, priority, and user assignment
  - Priority selection with Portuguese labels (Baixa, Média, Alta)
  - User assignment dropdown with all available users
  - Delete card with confirmation and position cleanup
  - Visual priority indicators with color coding
- **Real-time UI Updates**: All operations update interface without page refresh
  - State management with React hooks for instant feedback
  - Optimistic updates with error fallback handling
  - Proper loading states for all async operations

### Technical Implementation
- **Component Architecture**: Props-based callback system for parent-child communication
- **State Management**: Local React state with callback propagation for data consistency
- **Error Handling**: User-friendly error messages and proper fallback states
- **TypeScript Integration**: Full type safety across all CRUD operations
- **Form Validation**: Required field validation and business logic enforcement
- **UI/UX**: Confirmation dialogs, loading states, and hover effects

### Enhanced User Experience
- **Visual Feedback**: Loading states, hover effects, and visual confirmations
- **Keyboard Support**: Enter/Escape for column title editing
- **Responsive Design**: All forms and buttons work across screen sizes
- **Confirmation Dialogs**: Prevent accidental deletions with native confirm dialogs
- **Form Persistence**: Form data maintained during operations

## [0.3.0] - 2025-08-28

### Added - Phase 3: Basic Frontend Integration
- **React Components Architecture**: Modular component system for Kanban UI
  - `Board` component for displaying complete board with columns and cards
  - `Column` component with card count and responsive layout
  - `Card` component with priority colors, assignee display, and hover effects
  - `BoardsList` component for board navigation with grid layout
  - `BoardPage` wrapper component with navigation breadcrumbs
- **Routing System**: React Router implementation
  - `/` route for boards list view
  - `/board/:id` route for individual board detail view
  - Navigation between boards list and board detail with back button
- **API Integration**: Frontend consuming REST API endpoints
  - Fetch boards list from `/api/boards`
  - Fetch board details with columns and cards from `/api/boards/:id`
  - Proper error handling and loading states
  - TypeScript interfaces matching API response structure
- **Visual Design**: Responsive and polished UI
  - Grid layouts for boards and responsive column display
  - Priority color coding (High: red, Medium: yellow, Low: green)
  - Card hover effects and visual hierarchy
  - Portuguese labels for priority levels
  - Clean typography and spacing

### Technical Implementation
- **TypeScript Integration**: Full type safety across frontend components
- **Component Structure**: Organized in `/src/components/` directory
- **State Management**: React hooks (useState, useEffect) for API data
- **Responsive Design**: CSS Grid and Flexbox layouts
- **Dependencies**: Added React Router for navigation

### Fixed
- **Frontend Structure**: Removed default Vite boilerplate for clean Kanban interface
- **Type Safety**: Proper TypeScript interfaces for all API data structures

## [0.2.0] - 2025-08-27

### Added - Phase 2: REST API Implementation
- **Complete REST API** with all CRUD endpoints for Kanban functionality
- **Boards Management** endpoints:
  - GET `/api/boards` - List all boards
  - POST `/api/boards` - Create new board
  - GET `/api/boards/:id` - Get board with columns & cards
  - PUT `/api/boards/:id` - Update board
  - DELETE `/api/boards/:id` - Delete board
- **Columns Management** endpoints:
  - POST `/api/boards/:id/columns` - Create column in board
  - PUT `/api/columns/:id` - Update column (title, position)
  - DELETE `/api/columns/:id` - Delete column
  - POST `/api/columns/:id/reorder` - Reorder columns
- **Cards Management** endpoints:
  - POST `/api/columns/:id/cards` - Create card in column
  - GET `/api/cards/:id` - Get card details
  - PUT `/api/cards/:id` - Update card (title, description, priority, assignee)
  - DELETE `/api/cards/:id` - Delete card
  - POST `/api/cards/:id/move` - Move card between columns
- **Users Management** endpoints:
  - GET `/api/users` - List users for assignment
  - POST `/api/users` - Create user
  - GET `/api/users/:id` - Get user with cards
  - PUT `/api/users/:id` - Update user
  - DELETE `/api/users/:id` - Delete user
- **Advanced Features**:
  - Position management for drag & drop functionality
  - Automatic position recalculation when reordering items
  - Card movement between columns with proper position handling
  - User assignment to cards with complete relationships
  - Error handling middleware with Portuguese messages
  - Input validation and proper HTTP status codes
  - Complete TypeScript integration throughout API layer

### Technical Implementation
- **API Structure**: Organized routes in separate files (boards.ts, columns.ts, cards.ts, users.ts)
- **Middleware**: Error handling and async wrapper utilities
- **Type Safety**: Request/response type definitions in `types/api.ts`
- **Database Integration**: Proper use of Prisma relationships and queries
- **Testing**: All endpoints manually tested and verified working

### Fixed
- **String ID Handling**: Updated all routes to properly handle CUID string IDs instead of integers
- **Schema Alignment**: Corrected API implementation to match actual Prisma schema relationships
- **Required Fields**: Added proper validation for `createdById` field in card creation

## [0.1.0] - 2025-08-27

### Added - Phase 1: Project Foundation
- **Project Structure**: Monorepo setup with npm workspaces
- **Frontend**: React + Vite + TypeScript application (port 5173)
- **Backend**: Express + TypeScript server (port 3001)
- **Database**: Prisma ORM with SQLite setup
- **Database Schema**: Complete data model with 4 entities:
  - User model with email/name fields
  - Board model for project organization
  - Column model with position field for ordering
  - Card model with priority, descriptions, and assignments
- **Development Environment**: 
  - Concurrent development servers (`npm run dev`)
  - Database utilities (test, push, generate commands)
  - Individual service commands
- **Documentation**: Portuguese README and initial project setup docs
- **Database Features**:
  - CUID primary keys for better performance
  - Cascade delete relationships
  - Position-based ordering system
  - Optional assignee relationships
  - Auto timestamps (createdAt/updatedAt)

### Technical Setup
- TypeScript configuration for both frontend and backend
- Prisma client generation and database connection
- CORS and JSON middleware configuration
- Health check endpoint (`/api/health`)
- Database connection testing utilities

---

## Project Phases Overview

- **Phase 1 (v0.1.0)**: ✅ Foundation - Project structure, database schema, basic setup
- **Phase 2 (v0.2.0)**: ✅ REST API - Complete backend API with all CRUD operations
- **Phase 3 (v0.3.0)**: ✅ Frontend Integration - Connect React app to REST API
- **Phase 4 (v0.4.0)**: ✅ Complete CRUD Operations - Full CRUD in UI with TypeScript, validation, confirmations
- **Phase 5 (Planned)**: 🎯 Advanced Features - Drag & drop (cards and columns), card detail modal/editing, rich text editor, real-time updates, authentication
