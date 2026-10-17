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

const valido = { titulo: 'No enciende laptop', descripcion: 'Sin energia desde ayer', category_id: 1, solicitante_id: 1 };

test('POST crea un incidente NUEVO con prioridad BAJA por defecto', async () => {
  const api = await setup();
  const res = await api.post('/api/incidents').send(valido);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.estado, 'NUEVO');
  assert.strictEqual(res.body.prioridad, 'BAJA');
  assert.ok(res.body.id && res.body.created_at);
});

test('POST respeta la prioridad enviada', async () => {
  const api = await setup();
  const res = await api.post('/api/incidents').send({ ...valido, prioridad: 'CRITICA' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.prioridad, 'CRITICA');
});

test('POST valida campos obligatorios y catalogos', async () => {
  const api = await setup();
  const res = await api.post('/api/incidents').send({ titulo: '  ', prioridad: 'EXTREMA' });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.errors.length >= 4);
});

test('POST rechaza categoria o solicitante inexistentes', async () => {
  const api = await setup();
  const a = await api.post('/api/incidents').send({ ...valido, category_id: 99 });
  const b = await api.post('/api/incidents').send({ ...valido, solicitante_id: 99 });
  assert.strictEqual(a.status, 400);
  assert.strictEqual(b.status, 400);
});

test('GET lista incidentes y GET por id devuelve el detalle', async () => {
  const api = await setup();
  const { body } = await api.post('/api/incidents').send(valido);
  const list = await api.get('/api/incidents');
  assert.strictEqual(list.status, 200);
  assert.strictEqual(list.body.length, 1);
  const one = await api.get(`/api/incidents/${body.id}`);
  assert.strictEqual(one.body.titulo, valido.titulo);
});

test('GET por id responde 404 si no existe y 400 si el id es invalido', async () => {
  const api = await setup();
  assert.strictEqual((await api.get('/api/incidents/999')).status, 404);
  assert.strictEqual((await api.get('/api/incidents/abc')).status, 400);
});

test('JSON malformado responde 400', async () => {
  const api = await setup();
  const res = await api.post('/api/incidents').set('Content-Type', 'application/json').send('{no-json');
  assert.strictEqual(res.status, 400);
});

test('GET lista primero el incidente mas reciente (AB#358)', async () => {
  const api = await setup();
  const a = await api.post('/api/incidents').send({ ...valido, titulo: 'primero' });
  const b = await api.post('/api/incidents').send({ ...valido, titulo: 'segundo' });
  const list = await api.get('/api/incidents');
  assert.deepStrictEqual(list.body.map((i) => i.id), [b.body.id, a.body.id]);
});
