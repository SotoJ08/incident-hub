const test = require('node:test');
const assert = require('node:assert');
const { USUARIOS: U, crearEntorno, insertarIncidente } = require('./helpers');

// Escenario: 4 incidentes
//   1 (Ana, cat 1, asignado a Luis)   2 (Ana, cat 2, asignado a Marta)
//   3 (Pedro, cat 1, sin asignar)     4 (Pedro, cat 4 Telecomunicaciones, asignado a Carlos)
async function escenario() {
  const env = await crearEntorno();
  const i1 = await insertarIncidente(env.db, { titulo: 'laptop de Ana', category_id: 1, estado: 'ASIGNADO', tecnico_id: U.LUIS, solicitante_id: U.ANA });
  const i2 = await insertarIncidente(env.db, { titulo: 'sistema de Ana', category_id: 2, estado: 'ASIGNADO', tecnico_id: U.MARTA, solicitante_id: U.ANA });
  const i3 = await insertarIncidente(env.db, { titulo: 'monitor de Pedro', category_id: 1, solicitante_id: U.PEDRO });
  const i4 = await insertarIncidente(env.db, { titulo: 'red de Pedro', category_id: 4, estado: 'ASIGNADO', tecnico_id: U.CARLOS, solicitante_id: U.PEDRO });
  return { ...env, ids: { i1: i1.id, i2: i2.id, i3: i3.id, i4: i4.id } };
}

const titulos = (res) => res.body.map((i) => i.titulo).sort();

// ---------- visibilidad ----------

test('el administrador ve todos los incidentes', async () => {
  const { admin } = await escenario();
  assert.strictEqual((await admin.get('/api/incidents')).body.length, 4);
});

test('el solicitante ve solo los incidentes que reporto', async () => {
  const { as } = await escenario();
  assert.deepStrictEqual(titulos(await as(U.ANA).get('/api/incidents')), ['laptop de Ana', 'sistema de Ana']);
  assert.deepStrictEqual(titulos(await as(U.PEDRO).get('/api/incidents')), ['monitor de Pedro', 'red de Pedro']);
});

test('el tecnico de telecomunicaciones ve solo temas de telecomunicaciones', async () => {
  const { as } = await escenario();
  assert.deepStrictEqual(titulos(await as(U.CARLOS).get('/api/incidents')), ['red de Pedro']);
});

test('cada tecnico ve solo las categorias que atiende', async () => {
  const { as } = await escenario();
  assert.deepStrictEqual(titulos(await as(U.LUIS).get('/api/incidents')), ['laptop de Ana', 'monitor de Pedro']); // cat 1
  assert.deepStrictEqual(titulos(await as(U.MARTA).get('/api/incidents')), ['sistema de Ana']); // cats 2 y 3
});

test('los filtros no amplian la visibilidad: se combinan con ella', async () => {
  const { as } = await escenario();
  assert.deepStrictEqual((await as(U.LUIS).get('/api/incidents?category_id=4')).body, []);
  assert.deepStrictEqual((await as(U.ANA).get('/api/incidents?tecnico_id=5')).body, []);
});

test('un incidente fuera de alcance responde 404 en detalle, historial y comentarios', async () => {
  const { as, ids } = await escenario();
  for (const [usuario, id] of [[U.ANA, ids.i3], [U.LUIS, ids.i4], [U.CARLOS, ids.i1], [U.PEDRO, ids.i1]]) {
    const cli = as(usuario);
    assert.strictEqual((await cli.get(`/api/incidents/${id}`)).status, 404, `detalle usuario ${usuario}`);
    assert.strictEqual((await cli.get(`/api/incidents/${id}/events`)).status, 404, `historial usuario ${usuario}`);
    assert.strictEqual((await cli.post(`/api/incidents/${id}/comments`).send({ comentario: 'hola' })).status, 404, `comentario usuario ${usuario}`);
  }
});

test('un incidente dentro del alcance es visible y se puede comentar', async () => {
  const { as, ids } = await escenario();
  assert.strictEqual((await as(U.ANA).get(`/api/incidents/${ids.i1}`)).status, 200);
  assert.strictEqual((await as(U.LUIS).get(`/api/incidents/${ids.i1}`)).status, 200);
  assert.strictEqual((await as(U.CARLOS).post(`/api/incidents/${ids.i4}/comments`).send({ comentario: 'revisando enlace' })).status, 201);
});

// ---------- asignar ----------

test('solo el administrador puede asignar: solicitante y tecnico reciben 403', async () => {
  const { as, ids } = await escenario();
  const cuerpo = { tecnico_id: U.LUIS };
  assert.strictEqual((await as(U.ANA).patch(`/api/incidents/${ids.i1}/assign`).send(cuerpo)).status, 403);
  assert.strictEqual((await as(U.LUIS).patch(`/api/incidents/${ids.i3}/assign`).send(cuerpo)).status, 403);
  assert.strictEqual((await as(U.ADMIN).patch(`/api/incidents/${ids.i3}/assign`).send(cuerpo)).status, 200);
});

// ---------- cambiar estado ----------

test('el tecnico asignado puede cambiar el estado de su incidente', async () => {
  const { as, ids } = await escenario();
  const res = await as(U.LUIS).patch(`/api/incidents/${ids.i1}/status`).send({ estado: 'EN_PROCESO' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.estado, 'EN_PROCESO');
});

test('un tecnico no puede cambiar el estado de un incidente que ve pero no tiene asignado', async () => {
  const { as, db, ids } = await escenario();
  await db.query('INSERT INTO tecnico_categorias (user_id, category_id) VALUES (3, 1)'); // Marta tambien atiende la categoria 1
  const res = await as(U.MARTA).patch(`/api/incidents/${ids.i1}/status`).send({ estado: 'EN_PROCESO' }); // asignado a Luis
  assert.strictEqual(res.status, 403);
});

test('el solicitante nunca puede cambiar el estado, ni siquiera de su propio incidente', async () => {
  const { as, ids } = await escenario();
  assert.strictEqual((await as(U.ANA).patch(`/api/incidents/${ids.i1}/status`).send({ estado: 'EN_PROCESO' })).status, 403);
});

test('el administrador puede cambiar el estado de cualquier incidente asignado', async () => {
  const { as, ids } = await escenario();
  assert.strictEqual((await as(U.ADMIN).patch(`/api/incidents/${ids.i4}/status`).send({ estado: 'EN_PROCESO' })).status, 200);
});

test('el 403 no oculta el 404: sin visibilidad no se revela que el incidente existe', async () => {
  const { as, ids } = await escenario();
  assert.strictEqual((await as(U.CARLOS).patch(`/api/incidents/${ids.i1}/status`).send({ estado: 'EN_PROCESO' })).status, 404);
  assert.strictEqual((await as(U.PEDRO).patch(`/api/incidents/${ids.i1}/assign`).send({ tecnico_id: U.LUIS })).status, 404);
});

// ---------- creacion ----------

test('cualquier rol puede reportar un incidente y queda a su nombre', async () => {
  const { as } = await escenario();
  for (const id of [U.ANA, U.PEDRO, U.LUIS, U.ADMIN]) {
    const res = await as(id).post('/api/incidents').send({ titulo: 't', descripcion: 'd', category_id: 5 });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.solicitante_id, id);
  }
});
