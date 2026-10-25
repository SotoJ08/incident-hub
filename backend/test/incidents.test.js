const test = require('node:test');
const assert = require('node:assert');
const { USUARIOS, crearEntorno } = require('./helpers');

// Categoria 5 (Otros) no tiene tecnico: el incidente queda NUEVO. La 1 (Equipo de computo) se asigna sola a Luis.
const valido = { titulo: 'No enciende laptop', descripcion: 'Sin energia desde ayer', category_id: 5 };

test('POST crea un incidente NUEVO con prioridad BAJA si la categoria no tiene tecnico', async () => {
  const { as } = await crearEntorno();
  const res = await as(USUARIOS.ANA).post('/api/incidents').send(valido);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.estado, 'NUEVO');
  assert.strictEqual(res.body.prioridad, 'BAJA');
  assert.strictEqual(res.body.tecnico_id, null);
  assert.ok(res.body.id && res.body.created_at);
});

test('el solicitante es el usuario autenticado y se ignora el que venga en el cuerpo', async () => {
  const { as } = await crearEntorno();
  const res = await as(USUARIOS.PEDRO).post('/api/incidents').send({ ...valido, solicitante_id: USUARIOS.ANA });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.solicitante_id, USUARIOS.PEDRO);
});

test('POST respeta la prioridad enviada', async () => {
  const { as } = await crearEntorno();
  const res = await as(USUARIOS.ANA).post('/api/incidents').send({ ...valido, prioridad: 'CRITICA' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.prioridad, 'CRITICA');
});

test('POST valida campos obligatorios y catalogos', async () => {
  const { as } = await crearEntorno();
  const res = await as(USUARIOS.ANA).post('/api/incidents').send({ titulo: '  ', prioridad: 'EXTREMA' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.errors.length, 4);
});

test('POST rechaza una categoria inexistente', async () => {
  const { as } = await crearEntorno();
  const res = await as(USUARIOS.ANA).post('/api/incidents').send({ ...valido, category_id: 99 });
  assert.strictEqual(res.status, 400);
});

test('GET lista incidentes y GET por id devuelve el detalle (administrador)', async () => {
  const { admin, as } = await crearEntorno();
  const { body } = await as(USUARIOS.ANA).post('/api/incidents').send(valido);
  const list = await admin.get('/api/incidents');
  assert.strictEqual(list.status, 200);
  assert.strictEqual(list.body.length, 1);
  const one = await admin.get(`/api/incidents/${body.id}`);
  assert.strictEqual(one.body.titulo, valido.titulo);
});

test('GET lista primero el incidente mas reciente (AB#358)', async () => {
  const { admin, as } = await crearEntorno();
  const a = await as(USUARIOS.ANA).post('/api/incidents').send({ ...valido, titulo: 'primero' });
  const b = await as(USUARIOS.ANA).post('/api/incidents').send({ ...valido, titulo: 'segundo' });
  const list = await admin.get('/api/incidents');
  assert.deepStrictEqual(list.body.map((i) => i.id), [b.body.id, a.body.id]);
});

test('GET por id responde 404 si no existe y 400 si el id es invalido', async () => {
  const { admin } = await crearEntorno();
  assert.strictEqual((await admin.get('/api/incidents/999')).status, 404);
  assert.strictEqual((await admin.get('/api/incidents/abc')).status, 400);
});

test('JSON malformado responde 400', async () => {
  const { app } = await crearEntorno();
  const request = require('supertest');
  const res = await request(app).post('/api/incidents').set('Content-Type', 'application/json').send('{no-json');
  assert.strictEqual(res.status, 400);
});

test('sin sesion todas las rutas de la API responden 401', async () => {
  const { anon } = await crearEntorno();
  for (const [metodo, url] of [['get', '/api/incidents'], ['post', '/api/incidents'], ['get', '/api/incidents/1'], ['get', '/api/stats'], ['get', '/api/categories'], ['get', '/api/users']]) {
    assert.strictEqual((await anon[metodo](url)).status, 401, `${metodo} ${url}`);
  }
});

test('/health y /api/workflow son publicos', async () => {
  const { anon } = await crearEntorno();
  assert.strictEqual((await anon.get('/health')).status, 200);
  assert.strictEqual((await anon.get('/api/workflow')).status, 200);
});
