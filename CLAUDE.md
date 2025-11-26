# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FitJourney (internal name: gymbro) is a fitness coaching app with personalized workout and nutrition plans. It's a cross-platform application built with Next.js and Capacitor that runs on web, iOS, and Android.

**Key Tech Stack:**
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Next.js API routes, Server Actions, Middleware
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Mobile:** Capacitor 7 for iOS/Android
- **AI:** Anthropic Claude API (via @anthropic-ai/sdk) for workout/nutrition generation
- **Styling:** Tailwind CSS, Framer Motion animations
- **Auth:** Supabase Auth with OAuth (Google, Apple)

## Monorepo Structure

This is a pnpm + Turborepo monorepo:

```
gymbro/
├── apps/
│   └── web/              # Next.js 14 app (web + mobile)
│       ├── app/          # App Router pages
│       │   ├── (app)/    # Authenticated routes (journey, workouts, nutrition, etc.)
│       │   ├── (auth)/   # Auth flow (login/signup)
│       │   ├── api/      # API routes
│       │   └── onboarding/ # Onboarding questionnaire
│       ├── components/   # React components
│       ├── lib/          # Utilities, Supabase client, hooks
│       ├── ios/          # Capacitor iOS project
│       └── android/      # Capacitor Android project (if exists)
├── packages/
│   ├── db/               # Legacy Prisma package (not actively used)
│   └── types/            # Shared TypeScript types
├── supabase/
│   └── migrations/       # Database schema migrations
└── scripts/              # Build and deployment scripts
```

**Important:** The app uses Supabase directly via the `@supabase/supabase-js` client, NOT the Prisma package in `packages/db`.

## Common Commands

### Development

```bash
# Start Next.js dev server (web only)
pnpm dev:web                # Or: pnpm -C apps/web dev

# Run all services (uses Turborepo)
pnpm dev

# iOS Simulator (recommended for daily dev)
pnpm ios:run-sim           # Opens in iOS Simulator, connects to localhost:3000

# iOS Physical Device (USB)
pnpm ios:usb               # Start dev server + iproxy tunnel
pnpm ios:run-usb           # Sync and open Xcode

# Android
pnpm android:run           # Sync and open Android Studio

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Code formatting
pnpm format
```

### Database Operations

```bash
# Import exercises to Supabase
pnpm -C apps/web import-exercises

# Export exercises from Supabase
pnpm -C apps/web export-exercises

# Migrations are in supabase/migrations/
# Apply via Supabase Dashboard or CLI
```

### Diagnostics

```bash
# Check USB setup
pnpm doctor:usb

# Full iOS diagnostic
pnpm doctor:ios

# Check RLS policies
pnpm doctor:rls
```

### Mobile Development

See [README_DEV.md](README_DEV.md) and [MOBILE_BUILD_GUIDE.md](MOBILE_BUILD_GUIDE.md) for detailed mobile workflows.

## Architecture

### App Structure

The Next.js app uses App Router with route groups:

- **`(app)/`** - Protected routes requiring authentication
  - `journey/` - Main progress tracking and journey map
  - `workouts/` - Workout programs and exercise tracking
  - `nutrition/` - Meal plans and food logging with barcode scanner
  - `coach/` - AI coach chat interface
  - `profile/` - User settings and profile
  - `progress/` - Charts and analytics
  - `premium/` and `trial/` - Subscription management

- **`(auth)/`** - Authentication flows (bypasses auth middleware)

- **`onboarding/`** - Multi-step questionnaire for new users

- **`api/`** - API routes
  - `ai/` - Claude AI integration for workouts, nutrition, chat
  - `nutrition/` - Food database, barcode lookup
  - `journey/` - Progress tracking, stage unlocking
  - `subscription/` - Payment and trial management

### Database (Supabase)

**Key Tables:**
- `profiles` - User profiles (linked to Supabase Auth)
- `programs` - Workout programs with AI-generated content
- `workouts` - Individual workout days
- `workout_exercises` - Exercises within workouts (junction table)
- `exercises` - Exercise library
- `meals` - Meal plans and food items
- `plan_sessions` - User's nutrition/workout plan data
- `journey_progress` - Progress tracking and stage completion
- `stages` - Journey stages and milestones

**Authentication:**
- Uses Supabase Auth with Row Level Security (RLS)
- Client: `lib/supabase.ts` (browser client with Capacitor storage adapter)
- Server: `lib/supabase-server.ts` (for API routes and Server Actions)
- Middleware: `middleware.ts` handles auth state and redirects

### Mobile (Capacitor)

The app requires a **running Next.js server** (cannot bundle as static site):
- Uses middleware for auth and redirects
- Has API routes for AI, nutrition, workouts
- Uses Server Components and Server Actions

**Development modes:**
- Simulator: Connects to `http://localhost:3000`
- USB Device: Uses `iproxy` tunnel to localhost
- Production: Connects to deployed Vercel URL

Configuration: [capacitor.config.ts](apps/web/capacitor.config.ts)

### AI Integration

**Anthropic Claude SDK** powers:
- Workout plan generation (prompt in `lib/prompts/workout.ts`)
- Nutrition plan generation (prompt in `lib/prompts/nutrition.ts`)
- AI coach chat (`app/(app)/coach/`)

AI responses are streamed and stored in:
- `plan_sessions` table for nutrition/workout plans
- `program-draft.ts` for temporary storage during onboarding

### Key Features

1. **Onboarding Flow** - Multi-step questionnaire collecting goals, experience, diet preferences
2. **AI-Generated Programs** - Personalized workout and meal plans
3. **Journey System** - Gamified progress tracking with stages and milestones
4. **Barcode Scanner** - Uses `@capacitor-mlkit/barcode-scanning` for food logging
5. **Real-time Updates** - Supabase Realtime for live progress sync
6. **Push Notifications** - Web Push API + native push via Capacitor
7. **Streak Tracking** - Daily streak system for engagement
8. **Subscription/Trial** - Premium features with trial period

## Development Workflow

### Running Locally

1. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Fill in Supabase credentials and API keys
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start development:**
   ```bash
   # Web only
   pnpm dev:web

   # iOS Simulator
   pnpm ios:run-sim

   # iOS USB Device
   pnpm ios:usb  # Terminal 1
   pnpm ios:run-usb  # Terminal 2
   ```

### Testing on Devices

**iOS Simulator** (fastest iteration):
- Automatically connects to `localhost:3000`
- Hot reload works
- No USB cable needed

**iOS Physical Device** (for camera, sensors):
- Requires `iproxy` (install via `pnpm bootstrap:ios-usb`)
- Uses USB tunnel to access localhost

**Android**:
- Requires network IP configuration
- Update `DEV_SERVER_URL` if needed

### Production Builds

1. Deploy Next.js to Vercel:
   ```bash
   cd apps/web && vercel --prod
   ```

2. Set production URL:
   ```bash
   export MOBILE_PRODUCTION_URL=https://your-app.vercel.app
   ```

3. Sync mobile apps:
   ```bash
   npx cap sync ios
   npx cap sync android
   ```

4. Archive in Xcode/Android Studio for App Store/Play Store

## Important Files

### Configuration
- `capacitor.config.ts` - Mobile app configuration
- `turbo.json` - Turborepo pipeline
- `middleware.ts` - Auth and routing middleware

### Core Libraries
- `lib/supabase.ts` - Browser Supabase client
- `lib/supabase-server.ts` - Server Supabase client
- `lib/auth/` - Authentication utilities
- `lib/platform/` - Platform detection (web vs mobile)
- `lib/storage/` - Storage abstraction (localStorage vs Capacitor Preferences)

### AI & Generation
- `lib/ai.ts` - Claude API client
- `lib/prompts/` - AI prompts for workout/nutrition
- `app/api/ai/` - AI endpoints

### Features
- `lib/journey/` - Journey system logic
- `lib/nutrition/` - Nutrition tracking
- `lib/onboarding/` - Onboarding flow state
- `lib/subscription/` - Subscription management

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Public anon key
SUPABASE_SERVICE_ROLE_KEY=         # Service role key (server-side only)

# AI
ANTHROPIC_API_KEY=                 # Anthropic Claude API key
OPENAI_API_KEY=                    # OpenAI API key (if used)

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=      # Web push public key
VAPID_PRIVATE_KEY=                 # Web push private key
VAPID_SUBJECT=                     # Web push subject (email)

# Cron
CRON_SECRET=                       # Secret for cron endpoints
```

## Hebrew Localization

The app is primarily in Hebrew (RTL):
- Text content in `lib/assistantTexts.ts`
- Gender-specific variants (male/female/neutral)
- Use `getGenderedText()` helper for gendered content

## Security Notes

- All database access uses Row Level Security (RLS)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- API routes validate auth via `lib/supabase-server.ts`
- Secrets scanning with Gitleaks (`.gitleaks.toml`)
- See [SECURITY_FINAL_AUDIT.md](SECURITY_FINAL_AUDIT.md) for security checklist

## Troubleshooting

### Black screen on mobile
- Ensure dev server is running on port 3000
- Check Xcode console for connection errors
- For USB: verify `iproxy` is running

### Database errors
- Check RLS policies in Supabase Dashboard
- Use `pnpm doctor:rls` to diagnose

### Build errors
- Clean build: `pnpm -C apps/web ios:clean`
- Re-sync Capacitor: `pnpm ios:sync`
- Check environment variables

## Additional Documentation

Extensive documentation in root directory:
- [README_DEV.md](README_DEV.md) - Development guide
- [MOBILE_BUILD_GUIDE.md](MOBILE_BUILD_GUIDE.md) - Mobile build instructions
- [SECURITY_FINAL_AUDIT.md](SECURITY_FINAL_AUDIT.md) - Security checklist
- [EXERCISE_LIBRARY_IMPLEMENTATION.md](EXERCISE_LIBRARY_IMPLEMENTATION.md) - Exercise system
- Various `*_IMPLEMENTATION.md` files for specific features
