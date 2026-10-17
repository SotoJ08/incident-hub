const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { newDb } = require('pg-mem');
const { migrate } = require('../src/migrate');
const { createApp } = require('../src/app');

// Siembra 4 incidentes con combinaciones distintas de estado, prioridad, categoria y tecnico
async function setup() {
  const { Client } = newDb().adapters.createPg();
  const db = new Client();
  await db.connect();
  await migrate(db);
  await db.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8'));
  await db.query(`INSERT INTO incidents (titulo, descripcion, category_id, prioridad, estado, solicitante_id, tecnico_id) VALUES
    ('a', 'd', 1, 'BAJA',    'NUEVO',      1, NULL),
    ('b', 'd', 1, 'CRITICA', 'ASIGNADO',   1, 2),
    ('c', 'd', 2, 'CRITICA', 'EN_PROCESO', 1, 3),
    ('d', 'd', 2, 'ALTA',    'CERRADO',    1, 2)`);
  return request(createApp(db));
}

const titulos = (res) => res.body.map((i) => i.titulo).sort();

test('sin filtros devuelve todos los incidentes', async () => {
  const res = await (await setup()).get('/api/incidents');
  assert.strictEqual(res.body.length, 4);
});

test('filtra por estado', async () => {
  const res = await (await setup()).get('/api/incidents?estado=CERRADO');
  assert.deepStrictEqual(titulos(res), ['d']);
});

test('filtra por prioridad', async () => {
  const res = await (await setup()).get('/api/incidents?prioridad=CRITICA');
  assert.deepStrictEqual(titulos(res), ['b', 'c']);
});

test('filtra por categoria', async () => {
  const res = await (await setup()).get('/api/incidents?category_id=2');
  assert.deepStrictEqual(titulos(res), ['c', 'd']);
});

test('filtra por tecnico', async () => {
  const res = await (await setup()).get('/api/incidents?tecnico_id=2');
  assert.deepStrictEqual(titulos(res), ['b', 'd']);
});

test('combina filtros con AND', async () => {
  const res = await (await setup()).get('/api/incidents?prioridad=CRITICA&tecnico_id=3');
  assert.deepStrictEqual(titulos(res), ['c']);
});

test('un filtro sin coincidencias devuelve lista vacia', async () => {
  const res = await (await setup()).get('/api/incidents?estado=RESUELTO');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, []);
});

test('valores de filtro invalidos responden 400 con todos los errores', async () => {
  const res = await (await setup()).get('/api/incidents?estado=XX&prioridad=YY&category_id=abc&tecnico_id=-1');
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.errors.length, 4);
});
