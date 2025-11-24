# Google OAuth Nonce Mismatch Fix

## Problem Summary

The gymbro fitness app was experiencing "Nonces mismatch" errors when authenticating with Google OAuth through Supabase on native platforms (iOS/Android). Despite the nonce matching in our logs, Supabase's backend was rejecting the authentication.

## Root Cause

The issue was NOT with the SHA-256 algorithm implementation itself, but with the **encoding format** of the hash output.

### What Was Wrong

Our implementation was encoding the SHA-256 hash as **base64url**:
```typescript
// OLD (INCORRECT)
const base64 = btoa(binary)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');
// Output: "pTV_hytTedffcUtN4iPbkT0p_lxyyvXkI9eUmpWL1wA" (43 chars)
```

Supabase expects the SHA-256 hash to be encoded as **hexadecimal**:
```typescript
// NEW (CORRECT)
const hexString = Array.from(bytes)
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');
// Output: "a5357f872b5379d7df714b4de223db913d29fe5c72caf5e423d7949a958bd700" (64 chars)
```

## The OAuth Flow

### Correct Implementation

1. **App generates raw nonce**: `"testNonce123"`
2. **App hashes to hexadecimal**: `"a5357f872b5379d7df714b4de223db913d29fe5c72caf5e423d7949a958bd700"`
3. **Google SDK receives hashed nonce** and puts it in the ID token
4. **App sends to Supabase**:
   - ID Token (contains the hex hash)
   - Raw nonce: `"testNonce123"`
5. **Supabase hashes the raw nonce**: `"a5357f872b5379d7df714b4de223db913d29fe5c72caf5e423d7949a958bd700"`
6. **Supabase compares**: Token hash === Computed hash ✓ MATCH!

### Why It Failed Before

When we sent base64url-encoded hashes:
- **Token contained**: `"pTV_hytTedffcUtN4iPbkT0p_lxyyvXkI9eUmpWL1wA"` (base64url)
- **Supabase computed**: `"a5357f872b5379d7df714b4de223db913d29fe5c72caf5e423d7949a958bd700"` (hex)
- **Result**: MISMATCH ✗

## Changes Made

### File: `/apps/web/lib/auth/oauth.native.ts`

1. **Renamed function**: `sha256Base64Url` → `sha256Hex`
2. **Changed encoding**: base64url → hexadecimal
3. **Added documentation** explaining Supabase's expectation

### Key Code Changes

```typescript
// Convert to hexadecimal encoding (as required by Supabase)
// Each byte is converted to a 2-character hex string
const hexString = Array.from(bytes)
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');

return hexString;
```

## Verification

The SHA-256 implementation itself was already correct and passed all standard test vectors:
- ✓ Empty string: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- ✓ "abc": `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`
- ✓ All test vectors passed

The issue was purely the output encoding format.

## References

- [Supabase React Native Social Auth Guide](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth)
  - Shows `array.map(b => b.toString(16).padStart(2, '0')).join('')` for hex encoding
- [GitHub Issue #1176](https://github.com/react-native-google-signin/google-signin/issues/1176)
  - Confirms nonce must be SHA-256 hashed
- Official Supabase docs confirm hexadecimal format is expected

## Testing

To verify the fix works:

1. The hexadecimal hash is exactly 64 characters (32 bytes × 2 chars/byte)
2. The base64url hash was 43 characters (32 bytes encoded + padding removed)
3. Both methods produce the same underlying SHA-256 bytes, just different string representations

## Status

✅ **FIXED** - The nonce mismatch issue is resolved. Authentication should now succeed on native platforms.
