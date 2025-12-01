# AppsFlyer SDK Testing Guide

This document describes how to verify the AppsFlyer SDK integration on a physical iOS device.

## Prerequisites

1. Physical iOS device (AppsFlyer requires a real device, not simulator)
2. Xcode with the project open
3. Device connected via USB or wireless debugging
4. Access to the AppsFlyer dashboard (https://hq1.appsflyer.com)

## Configuration Verification

Before testing, verify the SDK is correctly configured:

1. **Info.plist keys** - Check these are set (not placeholder values):
   - `AppsFlyerDevKey`: Should be `Tm4JBxwBJwU7s9kuDWw9qE`
   - `AppsFlyerAppID`: Should be `6755480205`

2. **Podfile** - Verify `AppsFlyerFramework` pod is included

## Testing on Device

### Step 1: Build and Run

```bash
cd apps/web
pnpm build
npx cap sync ios
```

Then open Xcode and run on a physical device.

### Step 2: Check Console Logs

Watch the Xcode console for AppsFlyer initialization logs:

```
[AppsFlyer] Config status:
[AppsFlyer]   devKey: Tm4JBx...
[AppsFlyer]   appId: 6755480205
[AppsFlyer]   isConfigured: true
[AppsFlyer] Debug mode ENABLED (set isDebug=false for production)
[AppsFlyer] SDK initialized successfully
```

### Step 3: Verify Events

Perform these actions and watch for log output:

#### App Open
Open the app. You should see:
```
[AppsFlyer] Event logged: app_opened {...}
```

#### User Login/Signup
Log in or sign up. You should see:
```
[AppsFlyer] customerUserID set to: <user-id>
[AppsFlyer] Event logged: signup_completed {...}
```

#### Paywall View
Navigate to the premium/paywall page:
```
[AppsFlyer] Event logged: paywall_viewed {...}
```

#### Subscribe Click
Click a subscription button:
```
[AppsFlyer] Event logged: subscribe_click {...}
[AppsFlyer] Event logged: subscription_purchase_started {...}
```

#### Purchase Events
Complete or cancel a purchase:
```
[AppsFlyer] Event logged: subscription_purchase_success {...}
# or
[AppsFlyer] Event logged: subscription_purchase_cancelled {...}
# or
[AppsFlyer] Event logged: subscription_purchase_failed {...}
```

## Verifying in AppsFlyer Dashboard

1. Go to https://hq1.appsflyer.com
2. Navigate to your app (iOS App ID: 6755480205)
3. Go to **Activity** > **In-App Events**
4. Events should appear within a few minutes (debug mode sends immediately)

### Expected Events

| Event Name | When Fired | Key Properties |
|------------|------------|----------------|
| `app_opened` | App launch | `source` |
| `signup_completed` | After signup | `method` (email/google/apple) |
| `paywall_viewed` | Premium page load | `source` |
| `subscribe_click` | Subscribe button tap | `plan`, `is_recommended` |
| `subscription_purchase_started` | Purchase initiated | `plan`, `platform` |
| `subscription_purchase_success` | Purchase completed | `plan`, `transaction_id` |
| `subscription_purchase_cancelled` | User cancelled | `plan` |
| `subscription_purchase_failed` | Purchase error | `plan`, `error_type` |

## Troubleshooting

### Events Not Showing in Dashboard

1. **Wait a few minutes** - Even in debug mode, there may be slight delays
2. **Check device date/time** - Incorrect device time can cause issues
3. **Verify dev key** - Wrong key will silently fail

### Logs Not Appearing

1. Check `isConfigured` returns `true` in console
2. Verify running on physical device (not simulator)
3. Ensure `isDebug = true` for debug builds

### CustomerUserID Not Set

1. Verify user is logged in
2. Check `AnalyticsIdentity` component is mounted
3. Look for error logs in console

## Production Checklist

Before App Store release:

- [ ] Verify `isDebug = false` in production builds (this is automatic via `#if DEBUG`)
- [ ] Test all event types appear in dashboard
- [ ] Verify customerUserID matches Supabase auth user ID
- [ ] Confirm revenue events show correct currency/amounts

## Files Reference

| File | Purpose |
|------|---------|
| `ios/App/App/Info.plist` | AppsFlyer credentials |
| `ios/App/App/AppsFlyerConfig.swift` | Config helper |
| `ios/App/App/AppDelegate.swift` | SDK initialization |
| `ios/App/App/AppsFlyerPlugin.swift` | Capacitor bridge |
| `lib/appsflyer.ts` | TypeScript wrapper |
| `components/analytics/AnalyticsIdentity.tsx` | User ID sync |
