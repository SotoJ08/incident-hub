const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { newDb } = require('pg-mem');
const { migrate } = require('../src/migrate');
const { createApp } = require('../src/app');

async function setup(withIncidents = true) {
  const { Client } = newDb().adapters.createPg();
  const db = new Client();
  await db.connect();
  await migrate(db);
  await db.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8'));
  if (withIncidents) {
    // categorias: 1=Equipo, 2=Sistema; tecnicos: 2=Luis, 3=Marta
    await db.query(`INSERT INTO incidents (titulo, descripcion, category_id, prioridad, estado, solicitante_id, tecnico_id) VALUES
      ('a', 'd', 1, 'BAJA',    'NUEVO',      1, NULL),
      ('b', 'd', 1, 'CRITICA', 'ASIGNADO',   1, 2),
      ('c', 'd', 2, 'CRITICA', 'CERRADO',    1, 2),
      ('d', 'd', 2, 'ALTA',    'EN_PROCESO', 1, 3),
      ('e', 'd', 2, 'CRITICA', 'EN_PROCESO', 1, 3)`);
  }
  return request(createApp(db));
}

const find = (list, key, value) => list.find((x) => x[key] === value);

test('cuenta abiertos, cerrados, criticos y sin asignar', async () => {
  const res = await (await setup()).get('/api/stats');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.total, 5);
  assert.strictEqual(res.body.abiertos, 4);
  assert.strictEqual(res.body.cerrados, 1);
  assert.strictEqual(res.body.criticos, 2); // el critico CERRADO no cuenta
  assert.strictEqual(res.body.sin_asignar, 1);
});

test('distribucion por estado incluye todos los estados, incluso con cero', async () => {
  const res = await (await setup()).get('/api/stats');
  assert.deepStrictEqual(res.body.por_estado, { NUEVO: 1, ASIGNADO: 1, EN_PROCESO: 2, RESUELTO: 0, CERRADO: 1 });
});

test('distribucion por categoria incluye categorias sin incidentes', async () => {
  const res = await (await setup()).get('/api/stats');
  const cats = res.body.por_categoria;
  assert.strictEqual(cats.length, 4);
  assert.strictEqual(find(cats, 'nombre', 'Equipo de computo').total, 2);
  assert.strictEqual(find(cats, 'nombre', 'Sistema Institucional').total, 3);
  assert.strictEqual(find(cats, 'nombre', 'Telecomunicaciones').total, 0);
});

test('distribucion por tecnico lista solo tecnicos', async () => {
  const res = await (await setup()).get('/api/stats');
  const tecs = res.body.por_tecnico;
  assert.deepStrictEqual(tecs.map((t) => [t.nombre, t.total]), [['Luis Tecnico', 2], ['Marta Tecnica', 2]]);
});

test('sin incidentes todo vale cero', async () => {
  const res = await (await setup(false)).get('/api/stats');
  assert.strictEqual(res.body.total, 0);
  assert.strictEqual(res.body.abiertos, 0);
  assert.strictEqual(res.body.criticos, 0);
  assert.ok(res.body.por_categoria.every((c) => c.total === 0));
});

test('los totales son numeros, no cadenas', async () => {
  const res = await (await setup()).get('/api/stats');
  assert.strictEqual(typeof res.body.por_categoria[0].total, 'number');
  assert.strictEqual(typeof res.body.por_estado.NUEVO, 'number');
});
