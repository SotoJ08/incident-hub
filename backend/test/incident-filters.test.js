const test = require('node:test');
const assert = require('node:assert');
const { crearEntorno, insertarIncidente } = require('./helpers');

// Siembra 4 incidentes con combinaciones distintas de estado, prioridad, categoria y tecnico.
// Todas las pruebas consultan como administrador, que ve todo (la visibilidad por rol se prueba en permissions.test.js).
async function setup() {
  const env = await crearEntorno();
  await insertarIncidente(env.db, { titulo: 'a', category_id: 1, prioridad: 'BAJA', estado: 'NUEVO', tecnico_id: null });
  await insertarIncidente(env.db, { titulo: 'b', category_id: 1, prioridad: 'CRITICA', estado: 'ASIGNADO', tecnico_id: 2 });
  await insertarIncidente(env.db, { titulo: 'c', category_id: 2, prioridad: 'CRITICA', estado: 'EN_PROCESO', tecnico_id: 3 });
  await insertarIncidente(env.db, { titulo: 'd', category_id: 2, prioridad: 'ALTA', estado: 'CERRADO', tecnico_id: 2 });
  return env.admin;
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
