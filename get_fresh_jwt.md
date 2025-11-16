# How to Get Fresh JWT Token from Local App

## Quick Steps

1. **Open your local app** in browser:
   ```
   http://localhost:3000
   ```

2. **Log in** (or sign up if you don't have an account)

3. **Open DevTools**:
   - Press `F12` (Windows/Linux)
   - Or `Cmd+Option+I` (Mac)

4. **Go to Application tab** → **Local Storage** → `http://localhost:3000`

5. **Find the auth token key**:
   - Look for: `sb-ivzltlqsjrikffssyvbr-auth-token`
   - Click on it

6. **Copy the `access_token` value**:
   - It starts with `eyJ...`
   - This is your fresh JWT token

7. **Use it for testing**:
   ```bash
   export JWT='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

   # Test attach route
   curl -X POST http://localhost:3000/api/nutrition/attach \
     -H "Authorization: Bearer $JWT" \
     -H "Content-Type: application/json" \
     -d '{"status":"pending","fingerprint":"cli-test-001"}'
   ```

---

## Alternative: Get JWT via Browser Console

If you prefer, you can get the JWT directly via browser console:

1. Open http://localhost:3000 and log in
2. Open DevTools → Console tab
3. Run this code:

```javascript
// Get all localStorage keys
const keys = Object.keys(localStorage);

// Find the auth token key
const authKey = keys.find(k => k.includes('auth-token'));

if (authKey) {
  const authData = JSON.parse(localStorage.getItem(authKey));
  const jwt = authData.access_token;

  console.log('Your JWT Token:');
  console.log(jwt);

  // Copy to clipboard
  copy(jwt);
  console.log('✅ JWT copied to clipboard!');
} else {
  console.log('❌ No auth token found. Make sure you are logged in.');
}
```

4. The JWT will be copied to your clipboard automatically

---

## What to Do After Getting Fresh JWT

### Test Attach Route:

```bash
export JWT='your-fresh-jwt-here'

curl -X POST http://localhost:3000/api/nutrition/attach \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending","fingerprint":"cli-test-' $(date +%s) '"}'
```

**Expected response** (if everything works):
```json
{
  "ok": true,
  "saved": true,
  "fingerprint": "cli-test-1234567890",
  "calories": 2000
}
```

**Expected server logs:**
```
[Attach] POST user=xxxxxxxx fp=cli-test-123
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: cli-test-123)
```

### Test Plan API:

```bash
curl -H "Authorization: Bearer $JWT" http://localhost:3000/api/nutrition/plan
```

**Expected response:**
```json
{
  "ok": true,
  "plan": { ... },
  "calories": 2000,
  "updatedAt": "2025-11-02T..."
}
```

---

## Troubleshooting

### "No auth token found"

**Cause:** You're not logged in

**Fix:**
1. Go to http://localhost:3000
2. Sign up or log in
3. Try again

### "Authentication required" (401)

**Cause:** JWT expired

**Fix:**
1. Log out and log back in
2. Get a fresh JWT token
3. JWT tokens typically expire after 1 hour

### "Cannot find sb-ivzltlqsjrikffssyvbr-auth-token"

**Cause:** Different project ID or local storage cleared

**Fix:**
1. Check what auth keys exist in localStorage
2. Use the correct key name
3. Make sure you're looking at http://localhost:3000 (not another domain)

---

## Quick Reference

**App URL:** http://localhost:3000
**Expected Project ID:** ivzltlqsjrikffssyvbr
**Storage Key Format:** `sb-{project-id}-auth-token`
**JWT Format:** Starts with `eyJ...`, contains 3 parts separated by `.`
**JWT Expiry:** Typically 1 hour

---

## Next Step

Once you have a fresh JWT:
1. Export it: `export JWT='your-token'`
2. Run: `./test_attach_route.sh`
3. Check the results and server logs

See [DIAGNOSIS_REPORT.md](DIAGNOSIS_REPORT.md) for full details.
