const test = require('node:test');
const assert = require('node:assert');
const { USUARIOS, crearEntorno, insertarIncidente } = require('./helpers');

// categorias: 1=Equipo, 2=Sistema, 3=Accesos, 4=Telecomunicaciones, 5=Otros; tecnicos: 2=Luis, 3=Marta, 5=Carlos
async function setup(conIncidentes = true) {
  const env = await crearEntorno();
  if (conIncidentes) {
    await insertarIncidente(env.db, { titulo: 'a', category_id: 1, prioridad: 'BAJA', estado: 'NUEVO', tecnico_id: null, solicitante_id: USUARIOS.ANA });
    await insertarIncidente(env.db, { titulo: 'b', category_id: 1, prioridad: 'CRITICA', estado: 'ASIGNADO', tecnico_id: 2, solicitante_id: USUARIOS.ANA });
    await insertarIncidente(env.db, { titulo: 'c', category_id: 2, prioridad: 'CRITICA', estado: 'CERRADO', tecnico_id: 2, solicitante_id: USUARIOS.PEDRO });
    await insertarIncidente(env.db, { titulo: 'd', category_id: 2, prioridad: 'ALTA', estado: 'EN_PROCESO', tecnico_id: 3, solicitante_id: USUARIOS.PEDRO });
    await insertarIncidente(env.db, { titulo: 'e', category_id: 2, prioridad: 'CRITICA', estado: 'EN_PROCESO', tecnico_id: 3, solicitante_id: USUARIOS.ANA });
  }
  return env;
}

const find = (list, key, value) => list.find((x) => x[key] === value);

test('cuenta abiertos, cerrados, criticos y sin asignar (administrador)', async () => {
  const res = await (await setup()).admin.get('/api/stats');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.total, 5);
  assert.strictEqual(res.body.abiertos, 4);
  assert.strictEqual(res.body.cerrados, 1);
  assert.strictEqual(res.body.criticos, 2); // el critico CERRADO no cuenta
  assert.strictEqual(res.body.sin_asignar, 1);
});

test('distribucion por estado incluye todos los estados, incluso con cero', async () => {
  const res = await (await setup()).admin.get('/api/stats');
  assert.deepStrictEqual(res.body.por_estado, { NUEVO: 1, ASIGNADO: 1, EN_PROCESO: 2, RESUELTO: 0, CERRADO: 1 });
});

test('distribucion por categoria incluye categorias sin incidentes', async () => {
  const cats = (await (await setup()).admin.get('/api/stats')).body.por_categoria;
  assert.strictEqual(cats.length, 5);
  assert.strictEqual(find(cats, 'nombre', 'Equipo de computo').total, 2);
  assert.strictEqual(find(cats, 'nombre', 'Sistema Institucional').total, 3);
  assert.strictEqual(find(cats, 'nombre', 'Telecomunicaciones').total, 0);
});

test('distribucion por tecnico lista solo tecnicos', async () => {
  const tecs = (await (await setup()).admin.get('/api/stats')).body.por_tecnico;
  assert.deepStrictEqual(tecs.map((t) => [t.nombre, t.total]), [['Carlos Teleco', 0], ['Luis Tecnico', 2], ['Marta Tecnica', 2]]);
});

test('sin incidentes todo vale cero', async () => {
  const res = await (await setup(false)).admin.get('/api/stats');
  assert.strictEqual(res.body.total, 0);
  assert.strictEqual(res.body.abiertos, 0);
  assert.strictEqual(res.body.criticos, 0);
  assert.ok(res.body.por_categoria.every((c) => c.total === 0));
});

test('los totales son numeros, no cadenas', async () => {
  const res = await (await setup()).admin.get('/api/stats');
  assert.strictEqual(typeof res.body.por_categoria[0].total, 'number');
  assert.strictEqual(typeof res.body.por_estado.NUEVO, 'number');
});

test('el solicitante solo cuenta sus propios incidentes', async () => {
  const res = await (await setup()).as(USUARIOS.PEDRO).get('/api/stats');
  assert.strictEqual(res.body.total, 2); // c y d
  assert.strictEqual(res.body.cerrados, 1);
  assert.strictEqual(res.body.criticos, 0); // su unico critico (c) esta cerrado
  assert.strictEqual(res.body.por_estado.CERRADO, 1);
});

test('el tecnico solo cuenta los incidentes de las categorias que atiende y solo ve esas categorias', async () => {
  const res = await (await setup()).as(USUARIOS.MARTA).get('/api/stats'); // Marta: categorias 2 y 3
  assert.strictEqual(res.body.total, 3); // c, d, e
  assert.strictEqual(res.body.criticos, 1); // e
  assert.deepStrictEqual(res.body.por_categoria.map((c) => c.nombre).sort(), ['Gestion de Accesos', 'Sistema Institucional']);
});

test('un tecnico sin categorias no ve nada', async () => {
  const env = await setup();
  await env.db.query('DELETE FROM tecnico_categorias WHERE user_id = 5');
  const res = await env.as(USUARIOS.CARLOS).get('/api/stats');
  assert.strictEqual(res.body.total, 0);
});
