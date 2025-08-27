# Changelog

All notable changes to this Kanban project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **Phase 3 (Planned)**: 🎯 Frontend Integration - Connect React app to REST API
- **Phase 4 (Planned)**: 🎯 Advanced Features - Drag & drop, real-time updates, authentication