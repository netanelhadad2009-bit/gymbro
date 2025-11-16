# GymBro iOS Development Troubleshooting Guide

This document records all issues encountered during iOS development setup and their solutions.

## Table of Contents
1. [iOS WebView Safari Escapes](#ios-webview-safari-escapes)
2. [iOS Build Failure - Cannot Find Symbol](#ios-build-failure---cannot-find-symbol)
3. [404 Error on App Launch](#404-error-on-app-launch)
4. [Multiple Dev Servers Running](#multiple-dev-servers-running)

---

## iOS WebView Safari Escapes

### Problem
When clicking links with `target="_blank"` or calling `window.open()` in the iOS app, Safari would open externally instead of staying within the app's WebView. This broke the user experience and caused navigation errors.

### Why It Happened
- By default, WKWebView opens external links in Safari
- JavaScript `window.open()` calls triggered Safari
- Links with `target="_blank"` attribute opened in Safari
- No navigation delegate was configured to intercept these actions

### Solution

#### 1. JavaScript Layer (apps/web/app/mobile-boot.tsx)
Added dev-only link hijacking with MutationObserver:

```typescript
// Dev-only: Prevent Safari opens from target="_blank" / window.open
useEffect(() => {
  if (!__GYMBRO_DEV_HIJACK) return;

  try {
    // 1) Neutralize window.open
    const originalOpen = window.open;
    (window as any).open = function (url?: string | URL) {
      if (url && /^https?:\/\//.test(url.toString())) {
        window.location.href = url.toString();
        return null;
      }
      return originalOpen?.apply(window, arguments as any);
    };

    // 2) Rewrite <a target="_blank"> continuously
    const retarget = () => {
      document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')
        .forEach(a => { a.target = "_self"; });
    };
    retarget(); // Initial pass

    const mo = new MutationObserver(retarget);
    mo.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      (window as any).open = originalOpen;
      mo.disconnect();
    };
  } catch (e) {
    console.warn("[MobileBoot] link hijack failed", e);
  }
}, []);
```

#### 2. iOS Native Layer (ios/App/App/BridgeViewController.swift)
Implemented WKNavigationDelegate directly in BridgeViewController:

```swift
class BridgeViewController: CAPBridgeViewController, WKNavigationDelegate {
    private let allowedHosts: Set<String> = ["127.0.0.1", "localhost"]

    override func viewDidLoad() {
        super.viewDidLoad()

        // ... existing setup code ...

        if let webView = webView {
            webView.navigationDelegate = self
            webView.configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        }
    }

    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {

        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        // Allow capacitor scheme and file loads
        if url.scheme == "capacitor" || url.isFileURL {
            decisionHandler(.allow)
            return
        }

        // Same-origin dev server stays in webview
        if let host = url.host, allowedHosts.contains(host) {
            decisionHandler(.allow)
            return
        }

        // If it's opening in a new frame (target=_blank), force same webview
        if navigationAction.targetFrame == nil {
            webView.load(URLRequest(url: url))
            decisionHandler(.cancel)
            return
        }

        // Default: keep in-app
        webView.load(URLRequest(url: url))
        decisionHandler(.cancel)
    }
}
```

#### 3. Capacitor Configuration (apps/web/capacitor.config.ts)
Ensured correct dev server URL and disabled link previews:

```typescript
const config: CapacitorConfig = {
  appId: "com.gymbro.app",
  appName: "GymBro",
  webDir: "public",
  server: isDev
    ? {
        url: "http://127.0.0.1:3000",
        cleartext: true,
      }
    : undefined,
  ios: {
    backgroundColor: "#0B0D0E",
    contentInset: "always",
    allowsLinkPreview: false,  // Prevents iOS link preview popups
  },
};
```

### How to Apply Fix If It Happens Again
1. Ensure `apps/web/app/mobile-boot.tsx` has the dev hijack effect
2. Ensure `ios/App/App/BridgeViewController.swift` implements `WKNavigationDelegate`
3. Run `CAP_DEV=1 pnpm --package=@capacitor/cli dlx cap sync ios`
4. Clean build folder in Xcode (Cmd+Shift+K)
5. Rebuild and run

---

## iOS Build Failure - Cannot Find Symbol

### Problem
After adding `WebViewNavigationGuard.swift` file, Xcode build failed with error:
```
error: cannot find 'WebViewNavigationGuard' in scope
```

### Why It Happened
When creating Swift files outside of Xcode (via terminal/editor), they are **not automatically added to the Xcode project's build target**. The file existed on disk but Xcode didn't know to compile it.

### Solution
Instead of manually editing the `.pbxproj` file (complex and error-prone), we integrated the navigation guard directly into the existing `BridgeViewController.swift` file.

**Before (didn't work):**
- Separate file: `WebViewNavigationGuard.swift`
- BridgeViewController referenced it: `private let navGuard = WebViewNavigationGuard()`

**After (works):**
- Single file: `BridgeViewController.swift` implements `WKNavigationDelegate` directly
- No separate class needed

### How to Avoid This Issue
1. **Always add new Swift files through Xcode**, not terminal:
   - Right-click folder in Xcode → "New File..."
   - This ensures proper target membership

2. **If you must create files via terminal:**
   - Open Xcode
   - Drag the `.swift` file from Finder into the Xcode project navigator
   - Check "Copy items if needed" and select the correct target

3. **Or use inline implementations** (what we did):
   - Add functionality to existing Swift files that are already in the project

### How to Fix If It Happens Again
1. Remove the separate Swift file
2. Move the code into an existing Swift file (like `BridgeViewController.swift`)
3. Make the class conform to the protocol: `class BridgeViewController: CAPBridgeViewController, WKNavigationDelegate`
4. Implement the delegate methods inline

---

## 404 Error on App Launch

### Problem
When opening the iOS simulator, the app showed:
```
.This page could not be found 404
```

### Why It Happened
1. Middleware redirected users without completed onboarding to `/onboarding`
2. However, `/onboarding` has **no `page.tsx` file** - only a `layout.tsx` and child routes
3. Next.js returned 404 because no page existed at that exact path
4. The onboarding flow requires a specific step like `/onboarding/gender` or `/onboarding/activity`

### Root Cause Analysis
```
apps/web/app/onboarding/
├── layout.tsx          ✅ Exists (provides layout)
├── page.tsx            ❌ Missing (no index page)
├── gender/
│   └── page.tsx        ✅ Exists
├── activity/
│   └── page.tsx        ✅ Exists
└── ... (other steps)
```

Middleware code (before fix):
```typescript
if (!path.startsWith("/onboarding")) {
  return NextResponse.redirect(new URL("/onboarding", req.url));  // ❌ 404
}
```

### Solution
Updated middleware to redirect to the first onboarding step instead of the base route:

**File: `apps/web/middleware.ts`**

```typescript
} else {
  // Signed-in but not done → force onboarding
  if (!path.startsWith("/onboarding")) {
    console.log("[Middleware] Redirecting to /onboarding/gender");
    return NextResponse.redirect(new URL("/onboarding/gender", req.url));  // ✅ Specific page
  }
  return res;
}
```

### How to Fix If It Happens Again

#### Option 1: Redirect to Specific Step (Recommended - What We Did)
Update middleware to redirect to a valid onboarding step like `/onboarding/gender`

#### Option 2: Create Index Page
Create `apps/web/app/onboarding/page.tsx` that redirects to the first step:

```typescript
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding/gender");
  }, [router]);

  return null; // Or a loading spinner
}
```

#### Option 3: Check Onboarding Progress
Store current step in database and redirect to the appropriate step based on progress.

### Debugging 404 Issues
When you see a 404 error:

1. **Check dev server logs:**
   ```bash
   tail -50 /tmp/gymbro-dev.log | grep -E "(404|error)"
   ```

2. **Verify the route exists:**
   ```bash
   ls apps/web/app/YOUR_ROUTE/page.tsx
   ```

3. **Check middleware redirects:**
   Look for `console.log` statements in middleware showing where redirects are going

4. **Common Next.js route issues:**
   - Route groups like `(app)` are ignored in URLs: `app/(app)/journey` → URL is `/journey`
   - Folders without `page.tsx` = 404
   - Dynamic routes need square brackets: `[id]/page.tsx`

---

## Multiple Dev Servers Running

### Problem
Multiple dev server processes were running simultaneously on port 3000, causing:
- Port conflicts
- Connection failures
- App loading wrong server instance
- Inconsistent behavior

### Why It Happened
- Background bash shells from previous debugging sessions kept running
- Each attempt to fix issues started a new dev server
- Old servers weren't properly cleaned up

### Solution

#### Kill All Dev Servers
```bash
# Kill all node processes (dev servers)
killall -9 node 2>/dev/null || true

# Kill specific process on port 3000
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
```

#### Start Single Clean Dev Server
```bash
# Change to project directory
cd /Users/netanelhadad/Projects/gymbro/apps/web

# Start dev server on 127.0.0.1:3000 (not localhost for iOS)
pnpm dev --port 3000 --hostname 127.0.0.1 > /tmp/gymbro-dev.log 2>&1 &

# Wait and verify
sleep 5
curl -s http://127.0.0.1:3000/api/health
```

### How to Prevent This Issue

#### Create Helper Scripts
Add to `package.json`:

```json
{
  "scripts": {
    "dev:clean": "killall -9 node 2>/dev/null || true && pnpm -C apps/web dev --port 3000 --hostname 127.0.0.1",
    "dev:ios": "pnpm dev:clean",
    "dev:check": "lsof -ti :3000 || echo 'Port 3000 is free'"
  }
}
```

#### Before Starting Development
```bash
# Always check and clean first
pnpm dev:check
pnpm dev:clean
```

### How to Debug Port Issues

#### Check What's Running on Port 3000
```bash
lsof -ti :3000
# Returns PID if something is using port 3000

# See details
lsof -i :3000
```

#### Check All Background Bash Processes
```bash
ps aux | grep -E "next dev|pnpm.*dev" | grep -v grep
```

#### View Active Dev Server Logs
```bash
tail -f /tmp/gymbro-dev.log
```

---

## Complete iOS Dev Setup Checklist

### Prerequisites
1. ✅ Xcode installed with iOS Simulator
2. ✅ Node.js and pnpm installed
3. ✅ Supabase project set up with environment variables

### First-Time Setup

#### 1. Clean Environment
```bash
killall -9 node 2>/dev/null || true
cd /Users/netanelhadad/Projects/gymbro
```

#### 2. Start Dev Server
```bash
pnpm -C apps/web dev --port 3000 --hostname 127.0.0.1 > /tmp/gymbro-dev.log 2>&1 &
sleep 5
curl -s http://127.0.0.1:3000/api/health
```

#### 3. Sync Capacitor
```bash
CAP_DEV=1 pnpm --package=@capacitor/cli dlx cap sync ios
```

#### 4. Configure Xcode
- Open: `apps/web/ios/App/App.xcworkspace`
- Product → Scheme → Edit Scheme → Run → Arguments → Environment Variables
- Add: `CAP_DEV = 1` (checked ✓)

#### 5. Build and Run
- Product → Clean Build Folder (Cmd+Shift+K)
- Quit iOS Simulator
- Product → Run (Cmd+R)

### Expected Console Output
```
🧪 Capacitor Dev URL: http://127.0.0.1:3000
✅ BridgeViewController: webView configured with navigation guard
⚡️  Loading app at http://127.0.0.1:3000...
[MobileBoot] origin: http://127.0.0.1:3000
[MobileBoot] /api/health status: 200
⚡️  WebView loaded
```

---

## Quick Reference Commands

### Dev Server Management
```bash
# Kill all dev servers
killall -9 node 2>/dev/null || true

# Start fresh dev server
pnpm -C apps/web dev --port 3000 --hostname 127.0.0.1

# Check health
curl -s http://127.0.0.1:3000/api/health

# View logs
tail -f /tmp/gymbro-dev.log
```

### Capacitor Commands
```bash
# Sync to iOS (with dev mode enabled)
CAP_DEV=1 pnpm --package=@capacitor/cli dlx cap sync ios

# Open in Xcode
pnpm --package=@capacitor/cli dlx cap open ios
```

### iOS Build
```bash
# Command-line build (for debugging)
cd apps/web/ios/App
xcodebuild -workspace App.xcworkspace \
           -scheme App \
           -sdk iphonesimulator \
           -configuration Debug \
           clean build
```

---

## Common Error Messages and Solutions

### "Cannot reach dev server at http://127.0.0.1:3000"
**Solution:**
1. Check dev server is running: `curl http://127.0.0.1:3000/api/health`
2. Restart dev server: `killall -9 node && pnpm -C apps/web dev --port 3000 --hostname 127.0.0.1`
3. Verify CAP_DEV=1 in Xcode environment variables

### "This page could not be found 404"
**Solution:**
1. Check middleware redirects in `/tmp/gymbro-dev.log`
2. Ensure redirect targets valid routes with `page.tsx`
3. For onboarding, redirect to specific step like `/onboarding/gender`

### "cannot find 'SomeClass' in scope" (Swift)
**Solution:**
1. File not added to Xcode project target
2. Either: Add file through Xcode, OR move code to existing file

### "WebView failed provisional navigation"
**Solution:**
1. Ensure WKNavigationDelegate properly cancels external navigation
2. Check `decidePolicyFor navigationAction` implementation in BridgeViewController

---

## Maintenance Notes

### When to Sync Capacitor
Run `cap sync ios` whenever you change:
- `capacitor.config.ts`
- iOS plugins
- Web assets that need to be bundled

### When to Clean Build
Run Clean Build Folder (Cmd+Shift+K) when:
- Switching between dev/production modes
- After changing Swift files
- Build behaving unexpectedly
- After `cap sync`

### Dev Server Best Practices
1. Always use `127.0.0.1` not `localhost` for iOS
2. Run only ONE dev server at a time
3. Check logs when issues occur: `tail -f /tmp/gymbro-dev.log`
4. Restart dev server if middleware changes aren't applying

---

## File Reference

### Key Files Modified for iOS WebView Fix
- `apps/web/capacitor.config.ts` - Capacitor configuration
- `apps/web/app/mobile-boot.tsx` - JS link hijacking
- `apps/web/ios/App/App/BridgeViewController.swift` - Native navigation guard
- `apps/web/middleware.ts` - Authentication and routing logic

### Important Configuration Files
- `.env.local` - Environment variables (Supabase keys, etc.)
- `apps/web/capacitor.config.ts` - Capacitor iOS configuration
- `apps/web/ios/App/App.xcworkspace` - Xcode workspace
- `apps/web/next.config.mjs` - Next.js configuration

---

## Contact and Resources

### When Stuck
1. Check this troubleshooting guide first
2. View dev server logs: `tail -f /tmp/gymbro-dev.log`
3. Check Xcode console output
4. Verify all prerequisite steps completed

### Useful Resources
- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [WKWebView Documentation](https://developer.apple.com/documentation/webkit/wkwebview)

---

**Last Updated:** 2025-10-27
**App Version:** GymBro iOS Dev Build
**Next.js Version:** 14.2.12
**Capacitor Version:** 7.x
