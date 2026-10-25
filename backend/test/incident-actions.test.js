const test = require('node:test');
const assert = require('node:assert');
const { USUARIOS, crearEntorno, insertarIncidente } = require('./helpers');

// Incidente NUEVO y sin tecnico en la categoria 1 (Equipo de computo, que atiende Luis).
// Las acciones se ejecutan como administrador salvo que se indique otro usuario.
async function setup() {
  const env = await crearEntorno();
  const inc = await insertarIncidente(env.db, { category_id: 1 });
  return { ...env, id: inc.id };
}

const assign = (cli, id, tecnico_id) => cli.patch(`/api/incidents/${id}/assign`).send({ tecnico_id });
const status = (cli, id, estado) => cli.patch(`/api/incidents/${id}/status`).send({ estado });

test('asignar un incidente NUEVO lo pasa a ASIGNADO y registra la bitacora con el administrador como autor', async () => {
  const { admin, db, id } = await setup();
  const res = await assign(admin, id, USUARIOS.LUIS);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.estado, 'ASIGNADO');
  assert.strictEqual(res.body.tecnico_id, USUARIOS.LUIS);
  const ev = await db.query('SELECT tipo, autor_id FROM incident_events WHERE incident_id = $1', [id]);
  assert.deepStrictEqual(ev.rows, [{ tipo: 'ASIGNACION', autor_id: USUARIOS.ADMIN }]);
});

test('reasignar mantiene el estado y cambia el tecnico', async () => {
  const { admin, db, id } = await setup();
  await db.query('INSERT INTO tecnico_categorias (user_id, category_id) VALUES (3, 1)'); // Marta tambien atiende la 1
  await assign(admin, id, USUARIOS.LUIS);
  await status(admin, id, 'EN_PROCESO');
  const res = await assign(admin, id, USUARIOS.MARTA);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.estado, 'EN_PROCESO');
  assert.strictEqual(res.body.tecnico_id, USUARIOS.MARTA);
});

test('rechaza asignar a quien no es tecnico, no existe o no es un entero', async () => {
  const { admin, id } = await setup();
  assert.strictEqual((await assign(admin, id, USUARIOS.ANA)).status, 400);
  assert.strictEqual((await assign(admin, id, 99)).status, 400);
  assert.strictEqual((await assign(admin, id, 'x')).status, 400);
});

test('rechaza asignar un tecnico que no atiende la categoria del incidente', async () => {
  const { admin, id } = await setup();
  const res = await assign(admin, id, USUARIOS.CARLOS); // Carlos solo atiende telecomunicaciones
  assert.strictEqual(res.status, 400);
  assert.match(res.body.errors[0], /no atiende la categoria/);
});

test('rechaza asignar un incidente RESUELTO con 409', async () => {
  const { admin, db, id } = await setup();
  await db.query('INSERT INTO tecnico_categorias (user_id, category_id) VALUES (3, 1)');
  await assign(admin, id, USUARIOS.LUIS);
  for (const e of ['EN_PROCESO', 'RESUELTO']) await status(admin, id, e);
  assert.strictEqual((await assign(admin, id, USUARIOS.MARTA)).status, 409);
});

test('el ciclo completo NUEVO -> CERRADO deja una entrada de bitacora por paso', async () => {
  const { admin, db, id } = await setup();
  await assign(admin, id, USUARIOS.LUIS);
  for (const e of ['EN_PROCESO', 'RESUELTO', 'CERRADO']) {
    const r = await status(admin, id, e);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.estado, e);
  }
  const ev = await db.query("SELECT detalle FROM incident_events WHERE tipo = 'CAMBIO_ESTADO' ORDER BY id");
  assert.deepStrictEqual(ev.rows.map((r) => r.detalle), ['ASIGNADO -> EN_PROCESO', 'EN_PROCESO -> RESUELTO', 'RESUELTO -> CERRADO']);
});

test('una transicion invalida responde 409 con los estados permitidos', async () => {
  const { admin, id } = await setup();
  await assign(admin, id, USUARIOS.LUIS);
  const res = await status(admin, id, 'CERRADO');
  assert.strictEqual(res.status, 409);
  assert.deepStrictEqual(res.body.permitidos, ['EN_PROCESO']);
});

test('no se puede avanzar un incidente sin tecnico', async () => {
  const { admin, id } = await setup();
  assert.strictEqual((await status(admin, id, 'ASIGNADO')).status, 409);
});

test('valida estado e incidente', async () => {
  const { admin, id } = await setup();
  assert.strictEqual((await status(admin, id, 'INVALIDO')).status, 400);
  assert.strictEqual((await status(admin, 999, 'ASIGNADO')).status, 404);
  assert.strictEqual((await admin.patch('/api/incidents/abc/status').send({ estado: 'ASIGNADO' })).status, 400);
});

test('el autor de la bitacora no se toma del cuerpo de la peticion', async () => {
  const { admin, db, id } = await setup();
  await admin.patch(`/api/incidents/${id}/assign`).send({ tecnico_id: USUARIOS.LUIS, autor_id: USUARIOS.ANA });
  const ev = await db.query('SELECT autor_id FROM incident_events WHERE incident_id = $1', [id]);
  assert.strictEqual(ev.rows[0].autor_id, USUARIOS.ADMIN);
});
