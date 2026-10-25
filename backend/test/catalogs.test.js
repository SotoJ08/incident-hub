const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { newDb } = require('pg-mem');
const { migrate } = require('../src/migrate');
const { createApp } = require('../src/app');

async function setup() {
  const { Client } = newDb().adapters.createPg();
  const db = new Client();
  await db.connect();
  await migrate(db);
  await db.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8'));
  return request(createApp(db));
}

test('GET /api/categories devuelve las categorias del seed', async () => {
  const res = await (await setup()).get('/api/categories');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.length, 5);
  assert.ok(res.body.every((c) => c.id && c.nombre));
});

test('GET /api/users?rol=TECNICO devuelve solo tecnicos', async () => {
  const res = await (await setup()).get('/api/users?rol=TECNICO');
  assert.deepStrictEqual(res.body.map((u) => u.nombre), ['Carlos Teleco', 'Luis Tecnico', 'Marta Tecnica']);
});

test('GET /api/users sin filtro devuelve todos y rol invalido responde 400', async () => {
  const api = await setup();
  assert.strictEqual((await api.get('/api/users')).body.length, 6);
  assert.strictEqual((await api.get('/api/users?rol=NADA')).status, 400);
});
