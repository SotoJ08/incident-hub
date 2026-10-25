const test = require('node:test');
const assert = require('node:assert');
const { USUARIOS, crearEntorno } = require('./helpers');

test('GET /api/categories devuelve las categorias del seed', async () => {
  const res = await (await crearEntorno()).admin.get('/api/categories');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.length, 5);
  assert.ok(res.body.every((c) => c.id && c.nombre));
});

test('GET /api/users?rol=TECNICO devuelve solo tecnicos', async () => {
  const res = await (await crearEntorno()).admin.get('/api/users?rol=TECNICO');
  assert.deepStrictEqual(res.body.map((u) => u.nombre), ['Carlos Teleco', 'Luis Tecnico', 'Marta Tecnica']);
});

test('GET /api/users sin filtro devuelve todos y rol invalido responde 400', async () => {
  const { admin } = await crearEntorno();
  assert.strictEqual((await admin.get('/api/users')).body.length, 6);
  assert.strictEqual((await admin.get('/api/users?rol=NADA')).status, 400);
});

test('los catalogos no exponen correos ni hashes de contrasena', async () => {
  const res = await (await crearEntorno()).as(USUARIOS.ANA).get('/api/users');
  assert.strictEqual(res.status, 200);
  const texto = JSON.stringify(res.body);
  assert.ok(!texto.includes('scrypt') && !texto.includes('@example.com') && !texto.includes('password'));
});

test('cualquier rol autenticado puede leer los catalogos', async () => {
  const env = await crearEntorno();
  for (const id of Object.values(USUARIOS)) assert.strictEqual((await env.as(id).get('/api/categories')).status, 200);
});
