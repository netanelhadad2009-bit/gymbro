/**
 * APNs HTTP/2 Client
 * Sends push notifications to iOS devices via Apple Push Notification service
 *
 * Uses JWT authentication with ES256 signing
 *
 * Required environment variables:
 * - APNS_KEY_ID: Key ID from Apple Developer Portal
 * - APNS_TEAM_ID: Your Apple Developer Team ID
 * - APNS_KEY_P8: Base64-encoded .p8 private key content (or file path)
 * - APNS_BUNDLE_ID: Your app's bundle ID (e.g., com.fitjourney.app)
 */

import * as http2 from 'http2';
import * as crypto from 'crypto';

// APNs endpoints
const APNS_HOST_PRODUCTION = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';

// JWT token cache (tokens are valid for 1 hour, we refresh at 50 minutes)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes in ms

interface APNsConfig {
  keyId: string;
  teamId: string;
  privateKey: string;  // PEM-formatted private key
  bundleId: string;
  production: boolean;
}

export interface APNsPayload {
  alert: {
    title: string;
    body: string;
    subtitle?: string;
  };
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
  category?: string;
  threadId?: string;
}

export interface APNsResult {
  success: boolean;
  statusCode?: number;
  apnsId?: string;
  error?: string;
  reason?: string;
}

/**
 * Get configuration from environment variables
 */
function getConfig(): APNsConfig {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const keyP8 = process.env.APNS_KEY_P8;
  const bundleId = process.env.APNS_BUNDLE_ID || 'com.fitjourney.app';
  const production = process.env.NODE_ENV === 'production';

  if (!keyId || !teamId || !keyP8) {
    throw new Error(
      'Missing APNs configuration. Required: APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8'
    );
  }

  // Handle base64-encoded key or raw PEM
  let privateKey: string;
  if (keyP8.startsWith('-----BEGIN PRIVATE KEY-----')) {
    privateKey = keyP8;
  } else {
    // Assume base64 encoded
    privateKey = Buffer.from(keyP8, 'base64').toString('utf-8');
  }

  return { keyId, teamId, privateKey, bundleId, production };
}

/**
 * Generate JWT token for APNs authentication
 */
function generateJWT(config: APNsConfig): string {
  const now = Math.floor(Date.now() / 1000);

  // Check if we have a valid cached token
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // JWT header
  const header = {
    alg: 'ES256',
    kid: config.keyId
  };

  // JWT payload
  const payload = {
    iss: config.teamId,
    iat: now
  };

  // Encode header and payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Sign with ES256 (ECDSA using P-256 and SHA-256)
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign('SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(config.privateKey);

  // Convert DER signature to raw format (64 bytes: r + s)
  const rawSignature = derToRaw(signature);
  const encodedSignature = rawSignature.toString('base64url');

  // Combine into JWT
  cachedToken = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  tokenExpiry = Date.now() + TOKEN_REFRESH_INTERVAL;

  return cachedToken;
}

/**
 * Convert DER-encoded ECDSA signature to raw format (r || s)
 */
function derToRaw(derSignature: Buffer): Buffer {
  // DER format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
  let offset = 2; // Skip 0x30 and total length

  // Read r
  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid DER signature');
  }
  offset++;
  const rLength = derSignature[offset];
  offset++;
  let r = derSignature.subarray(offset, offset + rLength);
  offset += rLength;

  // Read s
  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid DER signature');
  }
  offset++;
  const sLength = derSignature[offset];
  offset++;
  let s = derSignature.subarray(offset, offset + sLength);

  // Remove leading zeros and pad to 32 bytes
  if (r.length > 32) r = r.subarray(r.length - 32);
  if (s.length > 32) s = s.subarray(s.length - 32);

  const rawSignature = Buffer.alloc(64);
  r.copy(rawSignature, 32 - r.length);
  s.copy(rawSignature, 64 - s.length);

  return rawSignature;
}

/**
 * Send a push notification to an iOS device
 */
export async function sendAPNsPush(
  deviceToken: string,
  payload: APNsPayload,
  options?: {
    production?: boolean;
    expiration?: number;
    priority?: 5 | 10;
    collapseId?: string;
  }
): Promise<APNsResult> {
  const config = getConfig();

  // Allow override of production setting
  const useProduction = options?.production ?? config.production;
  const host = useProduction ? APNS_HOST_PRODUCTION : APNS_HOST_SANDBOX;

  return new Promise((resolve) => {
    let client: http2.ClientHttp2Session | null = null;

    try {
      // Generate JWT
      const jwt = generateJWT(config);

      // Build APNs payload
      const apnsPayload = {
        aps: {
          alert: payload.alert,
          badge: payload.badge,
          sound: payload.sound || 'default',
          'thread-id': payload.threadId,
          category: payload.category,
          'mutable-content': 1  // Enable notification service extension
        },
        ...payload.data
      };

      // Clean up undefined values
      if (apnsPayload.aps.badge === undefined) delete apnsPayload.aps.badge;
      if (!apnsPayload.aps['thread-id']) delete apnsPayload.aps['thread-id'];
      if (!apnsPayload.aps.category) delete apnsPayload.aps.category;

      const body = JSON.stringify(apnsPayload);

      // Create HTTP/2 connection
      client = http2.connect(`https://${host}`);

      client.on('error', (err) => {
        console.error('[APNs] Connection error:', err);
        resolve({
          success: false,
          error: `Connection error: ${err.message}`
        });
      });

      // Set up timeout
      const timeout = setTimeout(() => {
        if (client) {
          client.close();
        }
        resolve({
          success: false,
          error: 'Request timeout'
        });
      }, 10000); // 10 second timeout

      // Make request
      const headers: http2.OutgoingHttpHeaders = {
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        'authorization': `bearer ${jwt}`,
        'apns-topic': config.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': String(options?.priority || 10),
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body)
      };

      if (options?.expiration) {
        headers['apns-expiration'] = String(options.expiration);
      }

      if (options?.collapseId) {
        headers['apns-collapse-id'] = options.collapseId;
      }

      const req = client.request(headers);

      let responseData = '';
      let responseHeaders: http2.IncomingHttpHeaders = {};

      req.on('response', (headers) => {
        responseHeaders = headers;
      });

      req.on('data', (chunk) => {
        responseData += chunk;
      });

      req.on('end', () => {
        clearTimeout(timeout);
        if (client) {
          client.close();
        }

        const statusCode = Number(responseHeaders[':status']);
        const apnsId = String(responseHeaders['apns-id'] || '');

        if (statusCode === 200) {
          console.log(`[APNs] Push sent successfully to ${deviceToken.substring(0, 8)}...`);
          resolve({
            success: true,
            statusCode,
            apnsId
          });
        } else {
          let reason = 'Unknown error';
          try {
            const errorBody = JSON.parse(responseData);
            reason = errorBody.reason || reason;
          } catch {
            // Ignore parse errors
          }

          console.error(`[APNs] Push failed: ${statusCode} - ${reason}`);
          resolve({
            success: false,
            statusCode,
            apnsId,
            error: `APNs error: ${reason}`,
            reason
          });
        }
      });

      req.on('error', (err) => {
        clearTimeout(timeout);
        if (client) {
          client.close();
        }
        console.error('[APNs] Request error:', err);
        resolve({
          success: false,
          error: `Request error: ${err.message}`
        });
      });

      // Send the payload
      req.write(body);
      req.end();

    } catch (error: any) {
      if (client) {
        client.close();
      }
      console.error('[APNs] Error sending push:', error);
      resolve({
        success: false,
        error: error.message || 'Unknown error'
      });
    }
  });
}

/**
 * Check if APNs is properly configured
 */
export function isAPNsConfigured(): boolean {
  return !!(
    process.env.APNS_KEY_ID &&
    process.env.APNS_TEAM_ID &&
    process.env.APNS_KEY_P8
  );
}

/**
 * APNs error reasons and their meanings
 */
export const APNsErrorReasons = {
  BadCollapseId: 'The collapse identifier exceeds the maximum allowed size',
  BadDeviceToken: 'The device token is invalid',
  BadExpirationDate: 'The expiration date is invalid',
  BadMessageId: 'The message ID is invalid',
  BadPriority: 'The priority is invalid',
  BadTopic: 'The topic is invalid',
  DeviceTokenNotForTopic: 'The device token does not match the topic',
  DuplicateHeaders: 'One or more headers were duplicated',
  IdleTimeout: 'Idle time out',
  InvalidPushType: 'The push type is invalid',
  MissingDeviceToken: 'The device token is missing',
  MissingTopic: 'The topic is missing',
  PayloadEmpty: 'The payload is empty',
  TopicDisallowed: 'Push to this topic is not allowed',
  BadCertificate: 'The certificate is invalid',
  BadCertificateEnvironment: 'The certificate does not match the environment',
  ExpiredProviderToken: 'The provider token is expired',
  Forbidden: 'The request is forbidden',
  InvalidProviderToken: 'The provider token is not valid',
  MissingProviderToken: 'No provider token was specified',
  BadPath: 'The path is invalid',
  MethodNotAllowed: 'The method is not allowed',
  Unregistered: 'The device token is no longer active',
  PayloadTooLarge: 'The payload was too large',
  TooManyProviderTokenUpdates: 'Too many requests were made with the same provider token',
  TooManyRequests: 'Too many requests were made to APNs',
  InternalServerError: 'An internal server error occurred',
  ServiceUnavailable: 'The service is unavailable',
  Shutdown: 'The server is shutting down'
} as const;
