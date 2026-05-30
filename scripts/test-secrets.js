const fs = require('fs');
const { randomBytes, scryptSync, createCipheriv, createDecipheriv } = require('crypto');

function readEnv() {
  try {
    const content = fs.readFileSync('.env', 'utf8');
    const lines = content.split(/\r?\n/);
    const map = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      map[key] = val.replace(/^"|"$/g, '');
    }
    return map;
  } catch (e) {
    return {};
  }
}

function getSecretPassword(env) {
  if (process.env.DEVVAULT_SECRET_PASSWORD) return process.env.DEVVAULT_SECRET_PASSWORD.trim();
  const explicit = env.DEVVAULT_SECRET_PASSWORD && env.DEVVAULT_SECRET_PASSWORD.trim();
  if (explicit) return explicit;
  const mongoUri = env.MONGODB_URI && env.MONGODB_URI.trim();
  if (!mongoUri) return '';
  try {
    const parsed = new URL(mongoUri);
    return decodeURIComponent(parsed.password || '');
  } catch (e) {
    return '';
  }
}

function getSecretKey(password) {
  if (!password) throw new Error('no password');
  return scryptSync(password, 'devvault-secret-salt', 32);
}

function encryptSecret(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc$${iv.toString('hex')}$${tag.toString('hex')}$${encrypted.toString('hex')}`;
}

function decryptSecret(token, key) {
  const parts = token.split('$');
  if (parts.length !== 4 || parts[0] !== 'enc') throw new Error('invalid');
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const encrypted = Buffer.from(parts[3], 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function hashSecret(value) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

async function main() {
  const env = readEnv();
  const password = getSecretPassword(env);
  console.log('Derived password:', password ? '[present]' : '[none]');

  if (!password) {
    console.log('No password found in DEVVAULT_SECRET_PASSWORD or MONGODB_URI; cannot test reversible encryption.');
  } else {
    const key = getSecretKey(password);
    const original = 'my-secret-value-1234';
    const token = encryptSecret(original, key);
    const roundtrip = decryptSecret(token, key);
    console.log('Original:', original);
    console.log('Encrypted token:', token);
    console.log('Decrypted back:', roundtrip);
    console.log('Roundtrip OK:', roundtrip === original);
  }

  const hashed = hashSecret('my-secret-value-1234');
  console.log('Hashed (scrypt) sample:', hashed);
  console.log('Hashed cannot be reversed.');
}

main().catch((e) => { console.error(e); process.exit(1); });
