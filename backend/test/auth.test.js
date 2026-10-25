const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('../src/auth');

const DEMO_PASS = 'IncidentHub#2026'; // contrasena de PRUEBA de los usuarios del seed (documentada en el README)
const SECRETO = 'secreto-de-prueba';

test('hashPassword genera sal distinta cada vez y verifyPassword valida la contrasena', () => {
  const a = hashPassword('una clave');
  const b = hashPassword('una clave');
  assert.notStrictEqual(a, b);
  assert.match(a, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.ok(verifyPassword('una clave', a));
  assert.ok(verifyPassword('una clave', b));
});

test('verifyPassword rechaza contrasenas incorrectas y formatos invalidos', () => {
  const h = hashPassword('correcta');
  assert.strictEqual(verifyPassword('incorrecta', h), false);
  assert.strictEqual(verifyPassword('', h), false);
  assert.strictEqual(verifyPassword('correcta', null), false);
  assert.strictEqual(verifyPassword('correcta', 'texto-plano'), false);
  assert.strictEqual(verifyPassword('correcta', 'bcrypt$a$b'), false);
  assert.strictEqual(verifyPassword(undefined, h), false);
});

test('con la misma sal el hash es reproducible (usado por el seed)', () => {
  const sal = '00112233445566778899aabbccddeeff';
  assert.strictEqual(hashPassword('x', sal), hashPassword('x', sal));
});

test('todos los hashes del seed corresponden a la contrasena de prueba', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8');
  const hashes = sql.match(/scrypt\$[0-9a-f]+\$[0-9a-f]+/g);
  assert.ok(hashes && hashes.length >= 6, 'el seed debe traer un hash por usuario');
  for (const h of hashes) assert.ok(verifyPassword(DEMO_PASS, h));
});

test('un token firmado se verifica y devuelve su contenido', () => {
  const token = signToken({ sub: 4, rol: 'ADMIN' }, SECRETO);
  const p = verifyToken(token, SECRETO);
  assert.strictEqual(p.sub, 4);
  assert.strictEqual(p.rol, 'ADMIN');
  assert.ok(p.exp > p.iat);
});

test('rechaza tokens con otra clave, alterados, mal formados o de otro algoritmo', () => {
  const token = signToken({ sub: 1, rol: 'SOLICITANTE' }, SECRETO);
  assert.strictEqual(verifyToken(token, 'otro-secreto'), null);

  const [h, b, s] = token.split('.');
  const alterado = Buffer.from(JSON.stringify({ sub: 1, rol: 'ADMIN', exp: 9999999999 })).toString('base64url');
  assert.strictEqual(verifyToken(`${h}.${alterado}.${s}`, SECRETO), null, 'cambiar el rol invalida la firma');

  assert.strictEqual(verifyToken('abc', SECRETO), null);
  assert.strictEqual(verifyToken(undefined, SECRETO), null);
  assert.strictEqual(verifyToken('a.b.c', SECRETO), null);

  const sinFirma = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  assert.strictEqual(verifyToken(`${sinFirma}.${b}.`, SECRETO), null, 'alg none no es aceptado');
});

test('un token expirado se rechaza', () => {
  const ahora = Date.now();
  const token = signToken({ sub: 2 }, SECRETO, { ttlSeconds: 60, now: ahora });
  assert.ok(verifyToken(token, SECRETO, { now: ahora + 30_000 }));
  assert.strictEqual(verifyToken(token, SECRETO, { now: ahora + 61_000 }), null);
});
