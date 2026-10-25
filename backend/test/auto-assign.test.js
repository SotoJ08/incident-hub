const test = require('node:test');
const assert = require('node:assert');
const { USUARIOS: U, crearEntorno, insertarIncidente } = require('./helpers');
const { elegir } = require('../src/assignment');

const crear = (cli, category_id, titulo = 'falla') => cli.post('/api/incidents').send({ titulo, descripcion: 'detalle', category_id });

test('cada categoria se asigna sola al tecnico que la atiende', async () => {
  const { as } = await crearEntorno();
  const ana = as(U.ANA);
  const esperado = [[1, U.LUIS], [2, U.MARTA], [3, U.MARTA], [4, U.CARLOS]]; // equipo, sistema, accesos, telecomunicaciones
  for (const [categoria, tecnico] of esperado) {
    const res = await crear(ana, categoria);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.tecnico_id, tecnico, `categoria ${categoria}`);
    assert.strictEqual(res.body.estado, 'ASIGNADO');
  }
});

test('una categoria sin tecnico deja el incidente NUEVO y sin evento', async () => {
  const { as, db } = await crearEntorno();
  const res = await crear(as(U.ANA), 5);
  assert.strictEqual(res.body.estado, 'NUEVO');
  assert.strictEqual(res.body.tecnico_id, null);
  const ev = await db.query('SELECT id FROM incident_events WHERE incident_id = $1', [res.body.id]);
  assert.strictEqual(ev.rows.length, 0);
});

test('la asignacion automatica queda en la bitacora, firmada por quien reporto', async () => {
  const { as, db } = await crearEntorno();
  const res = await crear(as(U.PEDRO), 4);
  const ev = await db.query('SELECT tipo, autor_id, detalle FROM incident_events WHERE incident_id = $1', [res.body.id]);
  assert.strictEqual(ev.rows.length, 1);
  assert.strictEqual(ev.rows[0].tipo, 'ASIGNACION');
  assert.strictEqual(ev.rows[0].autor_id, U.PEDRO);
  assert.match(ev.rows[0].detalle, /Asignacion automatica a Carlos Teleco/);
});

test('el tecnico de telecomunicaciones recibe y ve el incidente de telecomunicaciones; los demas no', async () => {
  const { as } = await crearEntorno();
  const res = await crear(as(U.ANA), 4, 'sin internet en el piso 2');
  const carlos = await as(U.CARLOS).get('/api/incidents');
  assert.deepStrictEqual(carlos.body.map((i) => i.id), [res.body.id]);
  assert.deepStrictEqual((await as(U.LUIS).get('/api/incidents')).body, []);
  assert.deepStrictEqual((await as(U.MARTA).get('/api/incidents')).body, []);
});

test('con varios tecnicos en una categoria se reparte por carga y el empate lo gana el menor id', async () => {
  const { as, db } = await crearEntorno();
  await db.query('INSERT INTO tecnico_categorias (user_id, category_id) VALUES (3, 1)'); // Marta tambien atiende equipo de computo
  const ana = as(U.ANA);
  const asignados = [];
  for (let i = 0; i < 4; i++) asignados.push((await crear(ana, 1, `n${i}`)).body.tecnico_id);
  assert.deepStrictEqual(asignados, [U.LUIS, U.MARTA, U.LUIS, U.MARTA]);
});

test('los incidentes cerrados no cuentan como carga', async () => {
  const { as, db } = await crearEntorno();
  await db.query('INSERT INTO tecnico_categorias (user_id, category_id) VALUES (3, 1)');
  for (let i = 0; i < 3; i++) await insertarIncidente(db, { category_id: 1, estado: 'CERRADO', tecnico_id: U.LUIS });
  await insertarIncidente(db, { category_id: 1, estado: 'EN_PROCESO', tecnico_id: U.MARTA });
  const res = await crear(as(U.ANA), 1);
  assert.strictEqual(res.body.tecnico_id, U.LUIS, 'Luis tiene 0 abiertos y Marta 1');
});

test('un tecnico asignado automaticamente puede operar su incidente de inmediato', async () => {
  const { as } = await crearEntorno();
  const inc = (await crear(as(U.ANA), 1)).body;
  const res = await as(U.LUIS).patch(`/api/incidents/${inc.id}/status`).send({ estado: 'EN_PROCESO' });
  assert.strictEqual(res.status, 200);
});

test('elegir: sin candidatos devuelve null y prioriza menor carga y luego menor id', () => {
  assert.strictEqual(elegir([]), null);
  assert.strictEqual(elegir([{ id: 5, carga: 1 }, { id: 3, carga: 1 }, { id: 9, carga: 0 }]).id, 9);
  assert.strictEqual(elegir([{ id: 5, carga: 2 }, { id: 3, carga: 2 }]).id, 3);
});
