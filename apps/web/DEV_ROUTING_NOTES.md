# Next.js Routing & Build Cache Issues

## Project Routing Architecture

This project uses **Next.js 14 App Router** exclusively. The legacy Pages Router (`pages/` directory) has been removed.

### Directory Structure

```
apps/web/
├── app/           ← All routes (App Router)
│   ├── (app)/    ← Protected app routes
│   ├── (auth)/   ← Auth routes
│   ├── api/      ← API routes
│   └── ...
├── lib/          ← Shared utilities
└── components/   ← UI components
```

**No `pages/` directory exists** - all routing uses the `app/` directory.

---

## Common Issue: "next/headers" Error After Refactoring

### Error Message

```
You're importing a component that needs next/headers.
That only works in a Server Component which is not supported
in the pages/ directory.
```

### Why This Happens

This error occurs when:
1. The project previously had a `pages/` directory that was removed
2. Next.js build cache contains stale compilation artifacts
3. The cache references old code that no longer exists

### Resolution

**Clear the build cache:**

```bash
cd apps/web
rm -rf .next node_modules/.cache
pnpm dev
```

### Prevention

- Always clear cache after major refactoring (Pages Router → App Router migration)
- Add `.next/` and `node_modules/.cache/` to `.gitignore` (already configured)

---

## Server Components & next/headers

### ✅ Valid Usage

`next/headers` can ONLY be used in **Server Components** (App Router):

```typescript
// ✅ CORRECT - Server Component (no "use client")
import { cookies } from 'next/headers';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  // ... server-side logic
}
```

### ❌ Invalid Usage

```typescript
// ❌ WRONG - Client Component cannot use next/headers
"use client";
import { cookies } from 'next/headers';  // ERROR!

export default function ProfilePage() {
  // ...
}
```

---

## Verification Steps

After clearing cache, verify the fix:

1. **Check server boots correctly:**
   ```bash
   pnpm dev
   # Should see: ✓ Ready in [time]ms
   ```

2. **Verify no pages/ directory:**
   ```bash
   ls -la apps/web/pages
   # Should show: "No such file or directory"
   ```

3. **Test iOS app connection:**
   ```bash
   CAP_DEV=1 CAP_SIM=1 pnpm cap sync ios
   # Should complete without errors
   ```

---

## Related Files

- `lib/supabase-server.ts` - Server-only Supabase client (uses next/headers)
- `lib/supabase.ts` - Browser-safe Supabase client (no next/headers)
- `lib/profile/getProfile.ts` - **SERVER-ONLY** (imports supabase-server.ts)
- `lib/profile/types.ts` - Safe for client/server (types and pure functions only)
- `lib/auth/post-auth.ts` - **CLIENT-SAFE** (used by client components, must not import server-only code)
- All files under `app/` - App Router (Server Components by default)

---

## Authentication & Post-Auth Flows

### Client-Safe Post-Authentication

The post-authentication flow (`lib/auth/post-auth.ts`) is used by **client components**:
- `components/SocialAuthButtons.tsx` (Google/Apple OAuth)
- `app/signup/SignupClient.tsx` (Email signup)

Because it's called from client code, it **cannot import**:
- `lib/supabase-server.ts` (uses next/headers)
- `lib/profile/getProfile.ts` (imports supabase-server.ts)
- Any other server-only modules

### Profile Completeness Check

To check profile completeness in client code:

```typescript
// ❌ WRONG - imports server-only code
import { getUserProfileSync } from '@/lib/profile/getProfile';
const profile = await getUserProfileSync(supabase, userId);

// ✅ CORRECT - query directly using client supabase
const { data: profileData } = await supabase
  .from('profiles')
  .select('age, gender, height_cm, weight_kg, goal')
  .eq('id', userId)
  .maybeSingle();

// Apply normalization inline
const normalizedProfile = {
  age: profileData.age || null,
  gender: normalizeGender(profileData.gender),
  // ... etc
};

// Check completeness
const isComplete = hasCompleteProfile(normalizedProfile);
```

See `lib/auth/post-auth.ts` Step 7 for the full implementation.

---

## Troubleshooting

**Q: Error persists after clearing cache?**
- Verify no client components import `lib/supabase-server`
- Check for `"use client"` directive at top of file
- Use `lib/supabase` (browser client) for client components instead

**Q: How to identify client vs server components?**
- **Client**: Has `"use client"` directive at top
- **Server**: No directive (default in App Router)

**Q: When to use each Supabase client?**
- `lib/supabase-server.ts`: Server Components, API routes (has next/headers)
- `lib/supabase.ts`: Client Components, browser-only code

---

**Last Updated:** 2025-11-20
**Issue Resolved:** Stale build cache after Pages Router removal
