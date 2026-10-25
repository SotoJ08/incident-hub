const test = require('node:test');
const assert = require('node:assert');
const { USUARIOS, crearEntorno, insertarIncidente } = require('./helpers');
const { MAX_COMENTARIO } = require('../src/routes/incident-history');

// Incidente de Ana en la categoria 1 (la atiende Luis), sin asignar
async function setup(datos = {}) {
  const env = await crearEntorno();
  const inc = await insertarIncidente(env.db, { category_id: 1, solicitante_id: USUARIOS.ANA, ...datos });
  return { ...env, id: inc.id };
}

const comment = (cli, id, comentario) => cli.post(`/api/incidents/${id}/comments`).send({ comentario });

test('un incidente nuevo tiene historial vacio', async () => {
  const { admin, id } = await setup();
  const res = await admin.get(`/api/incidents/${id}/events`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, []);
});

test('POST crea un comentario a nombre del usuario autenticado y GET lo muestra con su nombre', async () => {
  const { as, id } = await setup();
  const res = await comment(as(USUARIOS.ANA), id, '  Sigue sin encender  ');
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.tipo, 'COMENTARIO');
  assert.strictEqual(res.body.detalle, 'Sigue sin encender');
  assert.strictEqual(res.body.autor_id, USUARIOS.ANA);
  const hist = await as(USUARIOS.ANA).get(`/api/incidents/${id}/events`);
  assert.strictEqual(hist.body.length, 1);
  assert.strictEqual(hist.body[0].autor, 'Ana Solicitante');
});

test('el historial mezcla comentarios y eventos automaticos en orden cronologico', async () => {
  const { as, admin, id } = await setup();
  await comment(as(USUARIOS.ANA), id, 'primer comentario');
  await admin.patch(`/api/incidents/${id}/assign`).send({ tecnico_id: USUARIOS.LUIS });
  await as(USUARIOS.LUIS).patch(`/api/incidents/${id}/status`).send({ estado: 'EN_PROCESO' });
  await comment(as(USUARIOS.LUIS), id, 'lo reviso ahora');
  const hist = await admin.get(`/api/incidents/${id}/events`);
  assert.deepStrictEqual(hist.body.map((e) => e.tipo), ['COMENTARIO', 'ASIGNACION', 'CAMBIO_ESTADO', 'COMENTARIO']);
  assert.strictEqual(hist.body[3].autor, 'Luis Tecnico');
});

test('?tipo= filtra el historial y valida el valor', async () => {
  const { as, admin, id } = await setup();
  await comment(as(USUARIOS.ANA), id, 'a');
  await admin.patch(`/api/incidents/${id}/assign`).send({ tecnico_id: USUARIOS.LUIS });
  const solo = await admin.get(`/api/incidents/${id}/events?tipo=COMENTARIO`);
  assert.deepStrictEqual(solo.body.map((e) => e.tipo), ['COMENTARIO']);
  assert.strictEqual((await admin.get(`/api/incidents/${id}/events?tipo=XX`)).status, 400);
});

test('valida comentario vacio y demasiado largo', async () => {
  const { as, id } = await setup();
  assert.strictEqual((await comment(as(USUARIOS.ANA), id, '   ')).status, 400);
  assert.strictEqual((await comment(as(USUARIOS.ANA), id, 'x'.repeat(MAX_COMENTARIO + 1))).status, 400);
  assert.strictEqual((await as(USUARIOS.ANA).post(`/api/incidents/${id}/comments`).send({})).status, 400);
});

test('el autor del comentario no se toma del cuerpo de la peticion', async () => {
  const { as, id } = await setup();
  const res = await as(USUARIOS.ANA).post(`/api/incidents/${id}/comments`).send({ comentario: 'hola', autor_id: USUARIOS.ADMIN });
  assert.strictEqual(res.body.autor_id, USUARIOS.ANA);
});

test('responde 404 si el incidente no existe y 400 si el id es invalido', async () => {
  const { admin } = await setup();
  assert.strictEqual((await admin.get('/api/incidents/999/events')).status, 404);
  assert.strictEqual((await comment(admin, 999, 'hola')).status, 404);
  assert.strictEqual((await admin.get('/api/incidents/abc/events')).status, 400);
});

test('no permite comentar un incidente CERRADO', async () => {
  const { admin, id } = await setup({ estado: 'CERRADO', tecnico_id: USUARIOS.LUIS });
  assert.strictEqual((await comment(admin, id, 'tarde')).status, 409);
});
