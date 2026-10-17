const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { newDb } = require('pg-mem');
const { migrate } = require('../src/migrate');
const { createApp } = require('../src/app');

// Seed: usuarios 1=solicitante, 2 y 3=tecnicos, 4=admin
async function setup() {
  const { Client } = newDb().adapters.createPg();
  const db = new Client();
  await db.connect();
  await migrate(db);
  await db.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8'));
  const api = request(createApp(db));
  const { body } = await api.post('/api/incidents').send({ titulo: 't', descripcion: 'd', category_id: 1, solicitante_id: 1 });
  return { api, db, id: body.id };
}

const assign = (api, id, tecnico_id, autor_id = 4) => api.patch(`/api/incidents/${id}/assign`).send({ tecnico_id, autor_id });
const status = (api, id, estado, autor_id = 2) => api.patch(`/api/incidents/${id}/status`).send({ estado, autor_id });

test('asignar un incidente NUEVO lo pasa a ASIGNADO y registra la bitacora', async () => {
  const { api, db, id } = await setup();
  const res = await assign(api, id, 2);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.estado, 'ASIGNADO');
  assert.strictEqual(res.body.tecnico_id, 2);
  const ev = await db.query('SELECT tipo, autor_id FROM incident_events WHERE incident_id = $1', [id]);
  assert.deepStrictEqual(ev.rows, [{ tipo: 'ASIGNACION', autor_id: 4 }]);
});

test('reasignar mantiene el estado y cambia el tecnico', async () => {
  const { api, id } = await setup();
  await assign(api, id, 2);
  await status(api, id, 'EN_PROCESO');
  const res = await assign(api, id, 3);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.estado, 'EN_PROCESO');
  assert.strictEqual(res.body.tecnico_id, 3);
});

test('rechaza asignar a quien no es tecnico o no existe', async () => {
  const { api, id } = await setup();
  assert.strictEqual((await assign(api, id, 1)).status, 400);
  assert.strictEqual((await assign(api, id, 99)).status, 400);
  assert.strictEqual((await assign(api, id, 'x')).status, 400);
});

test('rechaza asignar un incidente RESUELTO con 409', async () => {
  const { api, id } = await setup();
  await assign(api, id, 2);
  for (const e of ['EN_PROCESO', 'RESUELTO']) await status(api, id, e);
  const res = await assign(api, id, 3);
  assert.strictEqual(res.status, 409);
});

test('el ciclo completo NUEVO -> CERRADO deja una entrada de bitacora por paso', async () => {
  const { api, db, id } = await setup();
  await assign(api, id, 2);
  for (const e of ['EN_PROCESO', 'RESUELTO', 'CERRADO']) {
    const r = await status(api, id, e);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.estado, e);
  }
  const ev = await db.query("SELECT detalle FROM incident_events WHERE tipo = 'CAMBIO_ESTADO' ORDER BY id");
  assert.deepStrictEqual(ev.rows.map((r) => r.detalle), ['ASIGNADO -> EN_PROCESO', 'EN_PROCESO -> RESUELTO', 'RESUELTO -> CERRADO']);
});

test('una transicion invalida responde 409 con los estados permitidos', async () => {
  const { api, id } = await setup();
  await assign(api, id, 2);
  const res = await status(api, id, 'CERRADO');
  assert.strictEqual(res.status, 409);
  assert.deepStrictEqual(res.body.permitidos, ['EN_PROCESO']);
});

test('no se puede avanzar un incidente sin tecnico', async () => {
  const { api, id } = await setup();
  const res = await status(api, id, 'ASIGNADO');
  assert.strictEqual(res.status, 409);
});

test('valida estado, autor e incidente', async () => {
  const { api, id } = await setup();
  assert.strictEqual((await status(api, id, 'INVALIDO')).status, 400);
  assert.strictEqual((await status(api, id, 'ASIGNADO', 99)).status, 400);
  assert.strictEqual((await api.patch(`/api/incidents/${id}/status`).send({ estado: 'ASIGNADO' })).status, 400);
  assert.strictEqual((await status(api, 999, 'ASIGNADO')).status, 404);
  assert.strictEqual((await api.patch('/api/incidents/abc/status').send({ estado: 'ASIGNADO', autor_id: 2 })).status, 400);
});
