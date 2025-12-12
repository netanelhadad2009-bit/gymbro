# FitJourney React Native Migration Plan

## Overview

This document outlines the migration from the current Next.js + Capacitor architecture to React Native + Expo with Supabase-only backend.

## Architecture Comparison

### Current Stack
- **Frontend**: Next.js 14 (App Router)
- **Mobile**: Capacitor (WebView-based)
- **Backend**: Next.js API routes + Vercel serverless
- **Database**: Supabase
- **Cron Jobs**: Vercel Cron

### Target Stack
- **Frontend/Mobile**: React Native + Expo
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase (unchanged)
- **Cron Jobs**: pg_cron (Postgres scheduler)

## Project Structure

```
gymbro/
├── apps/
│   ├── web/                    # Current Next.js app (keep running during migration)
│   └── mobile/                 # NEW: React Native Expo app
│       ├── app/                # Expo Router pages
│       │   ├── (auth)/        # Auth screens
│       │   ├── (app)/         # Main app tabs
│       │   └── onboarding/    # Onboarding flow
│       ├── components/        # React Native components
│       ├── contexts/          # Auth, subscription contexts
│       └── lib/               # Supabase client, utilities
├── packages/
│   └── types/                 # Shared TypeScript types
└── supabase/
    ├── functions/             # Edge Functions (replaces Vercel API routes)
    │   ├── ai-chat/
    │   ├── generate-workout/
    │   ├── generate-nutrition/
    │   └── send-push/
    └── migrations/            # Database migrations (unchanged)
```

## Migration Phases

### Phase 1: Foundation (Current)
- [x] Create React Native Expo project structure
- [x] Set up Expo Router with route groups
- [x] Configure Supabase client with SecureStore
- [x] Create AuthContext with session management
- [x] Set up basic tab navigation
- [x] Create Supabase Edge Functions structure

### Phase 2: Core Screens
- [ ] Migrate login/signup screens with Apple/Google OAuth
- [ ] Migrate onboarding questionnaire flow
- [ ] Create journey/progress screens
- [ ] Create workout screens (program view, exercise tracking)
- [ ] Create nutrition screens (meal plan, food logging)

### Phase 3: Features
- [ ] Migrate AI coach chat
- [ ] Implement barcode scanner (expo-camera + ML Kit)
- [ ] Set up push notifications (expo-notifications)
- [ ] Implement RevenueCat for in-app purchases
- [ ] Add streak tracking UI

### Phase 4: Backend Migration
- [ ] Deploy all Edge Functions to Supabase
- [ ] Set up pg_cron for scheduled tasks
- [ ] Migrate cron jobs (streak reset, reminders)
- [ ] Configure secrets in Supabase dashboard

### Phase 5: Polish & Release
- [ ] Performance optimization
- [ ] iOS & Android testing
- [ ] App Store / Play Store submission
- [ ] Gradual rollout to users

## API Routes to Edge Functions Mapping

| Current API Route | Edge Function | Status |
|------------------|---------------|--------|
| `/api/coach/messages` | `ai-chat` | Created |
| `/api/ai/workout` | `generate-workout` | Created |
| `/api/ai/nutrition` | `generate-nutrition` | Created |
| `/api/push/send` | `send-push` | Created |
| `/api/streak/*` | Database triggers + pg_cron | Planned |
| `/api/journey/*` | Direct Supabase queries | Planned |

## Cron Jobs Migration (Vercel → pg_cron)

The following cron jobs will be migrated to pg_cron:

```sql
-- Enable pg_cron extension (run once in Supabase SQL editor)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Reset streaks daily at midnight Israel time
SELECT cron.schedule(
  'reset-streaks',
  '0 22 * * *',  -- 00:00 Israel time (UTC+2)
  $$
  UPDATE profiles
  SET current_streak = 0,
      streak_updated_at = NOW()
  WHERE streak_updated_at < CURRENT_DATE - INTERVAL '1 day'
    AND current_streak > 0
  $$
);

-- Send daily reminder notifications
SELECT cron.schedule(
  'daily-reminders',
  '0 6 * * *',  -- 08:00 Israel time
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-daily-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  )
  $$
);

-- Clean up expired trial subscriptions
SELECT cron.schedule(
  'expire-trials',
  '0 0 * * *',
  $$
  UPDATE subscriptions
  SET status = 'expired'
  WHERE status = 'trial'
    AND trial_end < NOW()
  $$
);
```

## Environment Variables

### Mobile App (.env)
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx
```

### Supabase Edge Functions (Dashboard → Settings → Edge Functions)
```
ANTHROPIC_API_KEY=sk-ant-xxx
APNS_KEY_ID=xxx
APNS_TEAM_ID=xxx
APNS_KEY_P8=xxx (base64 encoded)
CRON_SECRET=xxx
```

## Key Differences: Next.js vs React Native

| Feature | Next.js/Capacitor | React Native/Expo |
|---------|------------------|-------------------|
| Rendering | WebView (DOM) | Native components |
| Styling | Tailwind CSS | StyleSheet/NativeWind |
| Navigation | Next.js App Router | Expo Router |
| Storage | localStorage + Capacitor | SecureStore + AsyncStorage |
| Animations | Framer Motion | Reanimated |
| Camera | @capacitor/camera | expo-camera |
| Push | Capacitor Push | expo-notifications |

## Commands

### Development
```bash
# Start Expo dev server
cd apps/mobile && npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Deploy Edge Functions
supabase functions deploy ai-chat
supabase functions deploy generate-workout
supabase functions deploy generate-nutrition
supabase functions deploy send-push
```

### Building
```bash
# Build iOS (requires EAS)
eas build --platform ios

# Build Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Keeping Current App Running

During migration, the current Next.js + Capacitor app continues to run:

1. **Web app**: Deployed on Vercel, unchanged
2. **Current iOS app**: Uses Capacitor WebView to Vercel deployment
3. **New mobile app**: Separate binary, same Supabase backend
4. **Database**: Shared between both apps

Users can gradually migrate by installing the new native app while keeping access to the web version.

## Testing Strategy

1. **Unit tests**: Jest for business logic
2. **Component tests**: React Native Testing Library
3. **E2E tests**: Detox for iOS/Android
4. **Manual testing**: Physical devices for each screen

## Rollback Plan

If issues arise:
1. Current Next.js app remains functional
2. Disable new app store builds
3. Edge Functions can be reverted via Supabase CLI
4. Database is shared, no migration needed

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Phase 1: Foundation | Done |
| Phase 2: Core Screens | 5-7 days |
| Phase 3: Features | 5-7 days |
| Phase 4: Backend Migration | 3-4 days |
| Phase 5: Polish & Release | 3-4 days |
| **Total** | **~3 weeks** |
