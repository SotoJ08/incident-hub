const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { newDb } = require('pg-mem');
const { migrate } = require('../src/migrate');

async function freshDb() {
  const { Client } = newDb().adapters.createPg();
  const client = new Client();
  await client.connect();
  await migrate(client);
  return client;
}

async function seed(client) {
  await client.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8'));
}

test('la migración aplica y es idempotente', async () => {
  const client = await freshDb();
  assert.deepStrictEqual(await migrate(client), []);
});

test('un incidente nuevo toma estado NUEVO y prioridad BAJA por defecto', async () => {
  const client = await freshDb();
  await seed(client);
  await client.query("INSERT INTO incidents (titulo, descripcion, category_id, solicitante_id) VALUES ('t', 'd', 1, 1)");
  const { rows } = await client.query('SELECT estado, prioridad, tecnico_id FROM incidents');
  assert.strictEqual(rows[0].estado, 'NUEVO');
  assert.strictEqual(rows[0].prioridad, 'BAJA');
  assert.strictEqual(rows[0].tecnico_id, null);
});

test('rechaza estados y prioridades fuera del catálogo', async () => {
  const client = await freshDb();
  await seed(client);
  await assert.rejects(client.query("INSERT INTO incidents (titulo, descripcion, category_id, solicitante_id, estado) VALUES ('t','d',1,1,'INVALIDO')"));
  await assert.rejects(client.query("INSERT INTO incidents (titulo, descripcion, category_id, solicitante_id, prioridad) VALUES ('t','d',1,1,'EXTREMA')"));
});

test('exige categoría y solicitante existentes', async () => {
  const client = await freshDb();
  await assert.rejects(client.query("INSERT INTO incidents (titulo, descripcion, category_id, solicitante_id) VALUES ('t','d',99,99)"));
});
