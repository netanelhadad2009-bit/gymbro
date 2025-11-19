# 🔐 Security Secrets Rotation Runbook

**Last Updated**: 2025-11-18
**Purpose**: Step-by-step guide for rotating all production secrets safely

---

## 🎯 Quick Reference

| Secret | Rotation Frequency | Critical? | Downtime? |
|--------|-------------------|-----------|-----------|
| Supabase Service Role Key | Quarterly or on breach | ✅ YES | ⚠️ Brief |
| Supabase Anon Key | Quarterly or on breach | ✅ YES | ⚠️ Brief |
| OpenAI API Key | On breach or monthly | ✅ YES | ❌ No |
| VAPID Keys (Push Notifications) | Yearly or on breach | ⚠️ Medium | ✅ Yes (re-subscription) |
| OAuth Credentials (Apple/Google) | On breach only | ⚠️ Medium | ❌ No |

---

## 1️⃣ Supabase Service Role Key

### What It Controls
- **Full database access** (bypasses RLS)
- Used by: Server-side API routes, admin scripts, migrations

### Files That Use It
- `apps/web/lib/supabase-admin.ts`
- `apps/web/lib/clients/israelMoH.ts`
- `apps/web/app/api/account/delete/route.ts`
- `apps/web/app/api/avatar/route.ts`
- All scripts in `apps/web/scripts/` (import_exercises, verify-*, etc.)

### Rotation Steps

#### 1. Generate New Key
```
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
2. Scroll to "Project API keys" section
3. Click "Regenerate" next to service_role key
4. Copy the NEW key immediately (it won't be shown again)
```

#### 2. Update Environment Variables

**Local Development:**
```bash
# Edit apps/web/.env.local
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci... <NEW_KEY>"
```

**Production (Vercel):**
```
1. Go to https://vercel.com/YOUR_TEAM/gymbro/settings/environment-variables
2. Find SUPABASE_SERVICE_ROLE_KEY
3. Click Edit → Enter new value → Save
4. Trigger redeploy: Vercel Dashboard → Deployments → Redeploy latest
```

#### 3. Verify
```bash
# Test admin endpoint
curl http://localhost:3000/api/account/delete \
  -H "Authorization: Bearer YOUR_TEST_JWT" \
  -X DELETE

# Should work (200 OK or appropriate response)
# If 500 or auth errors → check env var is loaded
```

#### 4. Revoke Old Key
```
1. Back in Supabase Dashboard → Settings → API
2. Confirm old key is no longer listed (regeneration removes it)
```

---

## 2️⃣ Supabase Anon Key

### What It Controls
- **Public client access** (respects RLS)
- Used by: All frontend requests, middleware, client-side Supabase client

### Files That Use It
- `apps/web/lib/supabase.ts` (client-side)
- `apps/web/lib/supabase-server.ts` (server-side cookies)
- `apps/web/middleware.ts`
- Any React component using Supabase directly

### Rotation Steps

#### 1. Generate New Key
```
1. Supabase Dashboard → Settings → API
2. Regenerate "anon public" key
3. Copy new key
```

#### 2. Update Environment Variables

**Local:**
```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci... <NEW_KEY>"
```

**Production (Vercel):**
```
Update NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env vars
Redeploy
```

#### 3. Verify
```bash
# Test any public API endpoint
curl http://localhost:3000/api/meals \
  -H "Authorization: Bearer YOUR_JWT"

# Should work normally
```

#### 4. Clear Client Caches
```
Since this is NEXT_PUBLIC_, clients will need to refresh.
Consider:
- Forcing cache invalidation via deployment
- Monitoring for spike in 401 errors (means old clients still using old key)
```

---

## 3️⃣ OpenAI API Key

### What It Controls
- AI nutrition plan generation
- AI workout generation
- AI coach chat responses
- Vision-based nutrition logging

### Files That Use It
- `apps/web/lib/openai.ts`
- `apps/web/lib/ai.ts`
- `apps/web/app/api/coach/chat/route.ts`
- `apps/web/app/api/ai/workout/route.ts`
- `apps/web/app/api/ai/nutrition/route.ts`
- `apps/web/app/api/ai/vision/nutrition/route.ts`

### Rotation Steps

#### 1. Generate New Key
```
1. Go to https://platform.openai.com/api-keys
2. Click "+ Create new secret key"
3. Name it "gymbro-production-YYYY-MM-DD"
4. Copy the key (sk-...)
```

#### 2. Update Environment Variables

**Local:**
```bash
# apps/web/.env.local
OPENAI_API_KEY="sk-... <NEW_KEY>"
```

**Production (Vercel):**
```
Update OPENAI_API_KEY in Vercel
Redeploy
```

#### 3. Verify
```bash
# Test AI nutrition endpoint
curl -X POST http://localhost:3000/api/nutrition/plan \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "gender_he": "זכר",
    "age": 30,
    "weight_kg": 75,
    "height_cm": 175,
    "goal_he": "ירידה במשקל",
    "activity_level_he": "בינונית",
    "diet_type_he": "מאוזן",
    "days": 1
  }'

# Should return nutrition plan
```

#### 4. Delete Old Key
```
1. Back in OpenAI Dashboard
2. Find old key
3. Click "Revoke"
```

---

## 4️⃣ VAPID Keys (Web Push Notifications)

### What They Control
- Web push notifications (Service Worker based)
- Subscribe/unsubscribe endpoints

### Files That Use Them
- `apps/web/lib/webpush.ts` (server-side sending)
- `apps/web/lib/push-client.ts` (client-side subscription)
- Service worker: `apps/web/public/sw.js`

### Rotation Steps

#### 1. Generate New VAPID Keys
```bash
# Run locally
cd /Users/netanelhadad/Projects/gymbro/apps/web
npx web-push generate-vapid-keys

# Output:
# =======================================
# Public Key:
# BHxUWW... <NEW_PUBLIC>
#
# Private Key:
# aBcXyZ... <NEW_PRIVATE>
# =======================================
```

#### 2. Update Environment Variables

**Local:**
```bash
# apps/web/.env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BHxUWW... <NEW_PUBLIC>"
VAPID_PRIVATE_KEY="aBcXyZ... <NEW_PRIVATE>"
VAPID_SUBJECT="mailto:support@fitjourney.app"  # Optional, can keep same
```

**Production (Vercel):**
```
Update both keys in Vercel
Redeploy
```

#### 3. ⚠️ IMPORTANT: All Users Must Re-Subscribe

VAPID key rotation **invalidates all existing subscriptions**.

**Migration Strategy:**
```javascript
// Add to apps/web/app/(app)/layout.tsx or notification prompt
useEffect(() => {
  // Detect old subscription
  if (navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Check if subscription uses old VAPID key
        // If yes, unsubscribe and re-subscribe with new key
        await subscription.unsubscribe();
        await resubscribeWithNewKey();
      }
    });
  }
}, []);
```

#### 4. Verify
```bash
# Test push subscription
curl -X POST http://localhost:3000/api/push/subscribe \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    }
  }'
```

---

## 5️⃣ OAuth Credentials (Apple Sign In / Google Auth)

### What They Control
- Social login via Apple
- Social login via Google (if implemented)

### Files That Reference Them
- Capacitor config: `apps/web/capacitor.config.ts`
- Environment variables (if any): Check for `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID`

### Rotation Steps

#### Apple Sign In
```
1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Find your App ID
3. Edit → Sign In with Apple → Regenerate Key
4. Download new .p8 key file
5. Update Supabase Auth settings with new key
```

#### Google OAuth
```
1. Go to https://console.cloud.google.com/apis/credentials
2. Find OAuth 2.0 Client ID
3. Create new credentials
4. Update Supabase Auth → Google provider settings
```

#### Verify
```bash
# Test Apple Sign In flow
# 1. Open app on iOS simulator
# 2. Tap "Sign in with Apple"
# 3. Should complete successfully
```

---

## ✅ Post-Rotation Checklist

After rotating any secret, complete this checklist:

- [ ] **Environment Variables Updated**
  - [ ] Local: `.env.local` updated
  - [ ] Staging: Vercel staging env vars updated
  - [ ] Production: Vercel production env vars updated

- [ ] **Application Redeployed**
  - [ ] Staging deployment successful
  - [ ] Production deployment successful
  - [ ] Health check passes: `/api/health`

- [ ] **Functionality Verified**
  - [ ] Auth flows work (login, signup, logout)
  - [ ] API endpoints respond correctly
  - [ ] AI features work (if OpenAI key rotated)
  - [ ] Push notifications work (if VAPID rotated)

- [ ] **Old Secrets Revoked**
  - [ ] Old key deleted/revoked in provider dashboard
  - [ ] Confirmed old key no longer works

- [ ] **Team Notified**
  - [ ] Developers updated their local `.env.local`
  - [ ] CI/CD updated (if applicable)

- [ ] **Monitoring**
  - [ ] Check error rates for next 24 hours
  - [ ] Monitor for unusual 401/500 spikes

---

## 🆘 Emergency Rotation (Security Breach)

If a secret is **compromised**:

1. **Immediate**: Rotate the secret following steps above (< 15 minutes)
2. **Within 1 hour**: Review logs for unauthorized access attempts
3. **Within 4 hours**: Audit all user accounts for suspicious activity
4. **Within 24 hours**: Complete security incident report
5. **Within 48 hours**: Notify affected users (if data breach occurred)

### Quick Rotation Checklist
```bash
# 1. Generate new keys (pick appropriate service)
# 2. Update Vercel production immediately
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter new key when prompted

# 3. Trigger immediate redeploy
vercel --prod

# 4. Update local dev
echo 'NEW_KEY=...' >> apps/web/.env.local

# 5. Revoke old key in provider dashboard
```

---

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [OpenAI API Key Safety](https://platform.openai.com/docs/guides/safety-best-practices)
- [Web Push VAPID Keys](https://developers.google.com/web/fundamentals/push-notifications/web-push-protocol)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Last Review**: 2025-11-18
**Next Review Due**: 2026-02-18 (Quarterly)
