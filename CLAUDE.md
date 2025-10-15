# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a pnpm + Turborepo monorepo for GymBro. The workspace is organized as:

- **apps/web** - Next.js 14 frontend (port 3000), uses Supabase for auth
- **services/api** - Express API service (port 3001), uses @gymbro/db package
- **packages/db** - Prisma database layer with PostgreSQL, accessed via shared package
- **packages/types** - Shared TypeScript types across the monorepo

## Common Commands

### Development
```bash
pnpm dev              # Run all services in parallel
pnpm build            # Build all packages and services
pnpm typecheck        # Type-check all packages
pnpm lint             # Lint all packages
pnpm test             # Run tests across all packages
pnpm format           # Format code with Prettier
```

### Working with individual packages
```bash
pnpm --filter @gymbro/web dev          # Run web app only
pnpm --filter @gymbro/api dev          # Run API service only
pnpm --filter @gymbro/db prisma:generate  # Generate Prisma client
pnpm --filter @gymbro/db prisma:migrate   # Run database migrations
pnpm --filter @gymbro/db seed             # Seed the database
```

### Database operations (from packages/db)
```bash
cd packages/db
pnpm prisma:generate    # Generate Prisma client after schema changes
pnpm prisma:migrate     # Create and apply migrations
pnpm seed               # Run seed script
```

## Architecture Notes

### Database Layer (@gymbro/db)
- PostgreSQL database accessed via Prisma ORM
- Schema defines: User, Profile, Subscription, WorkoutLog models
- User authentication is handled by Supabase (authUserId field links to Supabase Auth)
- The db package is imported as a workspace dependency in services/api

### API Service (@gymbro/api)
- Express server with TypeScript (uses tsx for development)
- Routes are organized in src/routes/ (auth, user, ai, dev utilities)
- Uses Anthropic SDK for AI features
- Validates inputs with Zod

### Web App (@gymbro/web)
- Next.js 14 App Router architecture
- Uses Supabase JS client for authentication
- Environment variables prefixed with NEXT_PUBLIC_* are exposed to the client
- API calls go to NEXT_PUBLIC_API_BASE_URL (defaults to http://localhost:3001)

### Coding Conventions (from .cursor/rules)
- TypeScript strict mode is enabled
- No business logic inside React components
- Environment variables accessed via process.env (NEXT_PUBLIC_* for client-side)
- Organize by feature/domain folders (workout/, nutrition/, billing/)
- API routes must validate inputs and handle errors explicitly

### Environment Setup
- Copy .env.example to .env and configure:
  - DATABASE_URL: PostgreSQL connection string (Supabase)
  - NEXT_PUBLIC_API_BASE_URL: API endpoint for frontend
