const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { newDb } = require('pg-mem');
const { migrate } = require('../src/migrate');
const { createApp } = require('../src/app');
const { MAX_COMENTARIO } = require('../src/routes/incident-history');

// Seed: usuarios 1=solicitante (Ana), 2 y 3=tecnicos (Luis, Marta), 4=admin
async function setup() {
  const { Client } = newDb().adapters.createPg();
  const db = new Client();
  await db.connect();
  await migrate(db);
  await db.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8'));
  const api = request(createApp(db));
  const { body } = await api.post('/api/incidents').send({ titulo: 't', descripcion: 'd', category_id: 1, solicitante_id: 1 });
  return { api, id: body.id };
}

const comment = (api, id, comentario, autor_id = 1) => api.post(`/api/incidents/${id}/comments`).send({ autor_id, comentario });

test('un incidente nuevo tiene historial vacio', async () => {
  const { api, id } = await setup();
  const res = await api.get(`/api/incidents/${id}/events`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, []);
});

test('POST crea un comentario y GET lo muestra con el nombre del autor', async () => {
  const { api, id } = await setup();
  const res = await comment(api, id, '  Sigue sin encender  ');
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.tipo, 'COMENTARIO');
  assert.strictEqual(res.body.detalle, 'Sigue sin encender');
  const hist = await api.get(`/api/incidents/${id}/events`);
  assert.strictEqual(hist.body.length, 1);
  assert.strictEqual(hist.body[0].autor, 'Ana Solicitante');
});

test('el historial mezcla comentarios y eventos automaticos en orden cronologico', async () => {
  const { api, id } = await setup();
  await comment(api, id, 'primer comentario');
  await api.patch(`/api/incidents/${id}/assign`).send({ tecnico_id: 2, autor_id: 4 });
  await api.patch(`/api/incidents/${id}/status`).send({ estado: 'EN_PROCESO', autor_id: 2 });
  await comment(api, id, 'lo reviso ahora', 2);
  const hist = await api.get(`/api/incidents/${id}/events`);
  assert.deepStrictEqual(hist.body.map((e) => e.tipo), ['COMENTARIO', 'ASIGNACION', 'CAMBIO_ESTADO', 'COMENTARIO']);
  assert.strictEqual(hist.body[3].autor, 'Luis Tecnico');
});

test('?tipo= filtra el historial y valida el valor', async () => {
  const { api, id } = await setup();
  await comment(api, id, 'a');
  await api.patch(`/api/incidents/${id}/assign`).send({ tecnico_id: 2, autor_id: 4 });
  const solo = await api.get(`/api/incidents/${id}/events?tipo=COMENTARIO`);
  assert.deepStrictEqual(solo.body.map((e) => e.tipo), ['COMENTARIO']);
  assert.strictEqual((await api.get(`/api/incidents/${id}/events?tipo=XX`)).status, 400);
});

test('valida comentario vacio, demasiado largo y autor invalido', async () => {
  const { api, id } = await setup();
  assert.strictEqual((await comment(api, id, '   ')).status, 400);
  assert.strictEqual((await comment(api, id, 'x'.repeat(MAX_COMENTARIO + 1))).status, 400);
  assert.strictEqual((await comment(api, id, 'ok', 99)).status, 400);
  assert.strictEqual((await api.post(`/api/incidents/${id}/comments`).send({ comentario: 'ok' })).status, 400);
});

test('responde 404 si el incidente no existe y 400 si el id es invalido', async () => {
  const { api } = await setup();
  assert.strictEqual((await api.get('/api/incidents/999/events')).status, 404);
  assert.strictEqual((await comment(api, 999, 'hola')).status, 404);
  assert.strictEqual((await api.get('/api/incidents/abc/events')).status, 400);
});

test('no permite comentar un incidente CERRADO', async () => {
  const { api, id } = await setup();
  await api.patch(`/api/incidents/${id}/assign`).send({ tecnico_id: 2, autor_id: 4 });
  for (const estado of ['EN_PROCESO', 'RESUELTO', 'CERRADO']) {
    await api.patch(`/api/incidents/${id}/status`).send({ estado, autor_id: 2 });
  }
  assert.strictEqual((await comment(api, id, 'tarde')).status, 409);
});
