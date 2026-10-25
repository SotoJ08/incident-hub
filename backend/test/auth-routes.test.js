const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { newDb } = require('pg-mem');
const { migrate } = require('../src/migrate');
const { createApp } = require('../src/app');
const { signToken } = require('../src/auth');

const DEMO_PASS = 'IncidentHub#2026'; // contrasena de PRUEBA de los usuarios del seed
const SECRETO = 'secreto-de-prueba';

async function setup() {
  const { Client } = newDb().adapters.createPg();
  const db = new Client();
  await db.connect();
  await migrate(db);
  await db.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8'));
  return { db, api: request(createApp(db, { authSecret: SECRETO })) };
}

const login = (api, email, password = DEMO_PASS) => api.post('/api/auth/login').send({ email, password });

test('login correcto devuelve token y los datos del usuario sin el hash', async () => {
  const { api } = await setup();
  const res = await login(api, 'admin@example.com');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.token.split('.').length === 3);
  assert.deepStrictEqual(
    { id: res.body.user.id, rol: res.body.user.rol, nombre: res.body.user.nombre },
    { id: 4, rol: 'ADMIN', nombre: 'Admin TI' }
  );
  assert.ok(!JSON.stringify(res.body).includes('scrypt'), 'nunca se devuelve el hash');
});

test('el correo no distingue mayusculas ni espacios', async () => {
  const { api } = await setup();
  assert.strictEqual((await login(api, '  ADMIN@Example.com ')).status, 200);
});

test('el tecnico recibe las categorias que atiende', async () => {
  const { api } = await setup();
  const marta = await login(api, 'marta@example.com');
  assert.deepStrictEqual(marta.body.user.categorias, [2, 3]);
  const carlos = await login(api, 'carlos@example.com');
  assert.deepStrictEqual(carlos.body.user.categorias, [4]);
  const ana = await login(api, 'ana@example.com');
  assert.deepStrictEqual(ana.body.user.categorias, []);
});

test('contrasena incorrecta y usuario inexistente responden igual (401, mismo mensaje)', async () => {
  const { api } = await setup();
  const mala = await login(api, 'admin@example.com', 'incorrecta');
  const noExiste = await login(api, 'nadie@example.com');
  assert.strictEqual(mala.status, 401);
  assert.strictEqual(noExiste.status, 401);
  assert.deepStrictEqual(mala.body, noExiste.body);
});

test('un usuario sin contrasena asignada no puede iniciar sesion', async () => {
  const { api, db } = await setup();
  await db.query("INSERT INTO users (nombre, email, rol) VALUES ('Sin clave', 'sinclave@example.com', 'TECNICO')");
  assert.strictEqual((await login(api, 'sinclave@example.com')).status, 401);
});

test('login valida que lleguen email y password', async () => {
  const { api } = await setup();
  assert.strictEqual((await api.post('/api/auth/login').send({})).status, 400);
  assert.strictEqual((await api.post('/api/auth/login').send({ email: 'a@b.c' })).status, 400);
  assert.strictEqual((await api.post('/api/auth/login').send({ email: '  ', password: 'x' })).status, 400);
});

test('GET /api/auth/me devuelve al usuario del token y exige autenticacion', async () => {
  const { api } = await setup();
  const { body } = await login(api, 'luis@example.com');
  const me = await api.get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.email, 'luis@example.com');
  assert.deepStrictEqual(me.body.user.categorias, [1]);
  assert.strictEqual((await api.get('/api/auth/me')).status, 401);
  assert.strictEqual((await api.get('/api/auth/me').set('Authorization', 'Bearer basura')).status, 401);
  assert.strictEqual((await api.get('/api/auth/me').set('Authorization', body.token)).status, 401, 'falta el prefijo Bearer');
});

test('un token firmado con otra clave o de un usuario inexistente se rechaza', async () => {
  const { api } = await setup();
  const ajeno = signToken({ sub: 4, rol: 'ADMIN' }, 'otra-clave');
  assert.strictEqual((await api.get('/api/auth/me').set('Authorization', `Bearer ${ajeno}`)).status, 401);
  const fantasma = signToken({ sub: 999, rol: 'ADMIN' }, SECRETO);
  assert.strictEqual((await api.get('/api/auth/me').set('Authorization', `Bearer ${fantasma}`)).status, 401);
});

test('el rol se lee de la base: cambiarlo surte efecto sin volver a iniciar sesion', async () => {
  const { api, db } = await setup();
  const { body } = await login(api, 'luis@example.com');
  await db.query("UPDATE users SET rol = 'ADMIN' WHERE id = 2");
  const me = await api.get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
  assert.strictEqual(me.body.user.rol, 'ADMIN');
});
