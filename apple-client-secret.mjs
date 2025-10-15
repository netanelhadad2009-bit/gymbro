import * as jose from 'jose';
import fs from 'fs';

// ==== Fill these with the values I will provide you ====
const TEAM_ID   = 'K5SDH2PTSX';
const KEY_ID    = '2RTSTK5W3M';               // from the Apple Key you created
const CLIENT_ID = 'com.gymbro.web';           // the Service ID (e.g. com.yourcompany.gymbro.web)
const PRIVATE_KEY_P8_PATH = '/Users/netanelhadad/Downloads/AuthKey_2RTSTK5W3M.p8';
// =======================================================

const privateKeyPem = fs.readFileSync(PRIVATE_KEY_P8_PATH, 'utf8');

const alg = 'ES256';
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 180; // ~180 days (Apple allows up to 6 months)

const secret = await new jose.SignJWT({ sub: CLIENT_ID, aud: 'https://appleid.apple.com' })
  .setProtectedHeader({ alg, kid: KEY_ID })
  .setIssuedAt(iat)
  .setExpirationTime(exp)
  .setIssuer(TEAM_ID)
  .sign(await jose.importPKCS8(privateKeyPem, alg));

console.log('\n=== APPLE CLIENT SECRET (JWT) ===\n');
console.log(secret);
console.log('\n================================\n');