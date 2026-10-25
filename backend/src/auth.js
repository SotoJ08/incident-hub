// Autenticacion sin dependencias nuevas: hash de contrasenas con scrypt y tokens HS256 firmados con HMAC.
// (AB#380) El secreto de firma viene de AUTH_SECRET y nunca se escribe en el repositorio.
const crypto = require('crypto');

const KEYLEN = 64;
const b64u = (data) => Buffer.from(data).toString('base64url');

// Formato almacenado: scrypt$<sal>$<hash>, ambos en hexadecimal
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [alg, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const calculado = crypto.scryptSync(password, salt, KEYLEN);
  const esperado = Buffer.from(hash, 'hex');
  return esperado.length === calculado.length && crypto.timingSafeEqual(calculado, esperado);
}

function signToken(payload, secret, { ttlSeconds = 8 * 3600, now = Date.now() } = {}) {
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const iat = Math.floor(now / 1000);
  const body = b64u(JSON.stringify({ ...payload, iat, exp: iat + ttlSeconds }));
  const firma = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${firma}`;
}

// Devuelve el payload si el token es valido y no ha expirado; si no, null
function verifyToken(token, secret, { now = Date.now() } = {}) {
  if (typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [header, body, firma] = partes;
  try {
    if (JSON.parse(Buffer.from(header, 'base64url').toString('utf8')).alg !== 'HS256') return null;
    const esperada = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest();
    const recibida = Buffer.from(firma, 'base64url');
    if (recibida.length !== esperada.length || !crypto.timingSafeEqual(recibida, esperada)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
