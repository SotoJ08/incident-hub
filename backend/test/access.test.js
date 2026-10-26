const test = require('node:test');
const assert = require('node:assert');
const { scopeFor, canSee, canOperate, canAssign } = require('../src/access');

const admin = { id: 4, rol: 'ADMIN', categorias: [] };
const tecnico = { id: 2, rol: 'TECNICO', categorias: [1, 3] };
const sinCategorias = { id: 7, rol: 'TECNICO', categorias: [] };
const solicitante = { id: 1, rol: 'SOLICITANTE', categorias: [] };

test('scopeFor: el administrador no tiene restriccion', () => {
  assert.deepStrictEqual(scopeFor(admin), { sql: '', params: [] });
});

test('scopeFor: el tecnico se limita a sus categorias con marcadores consecutivos', () => {
  assert.deepStrictEqual(scopeFor(tecnico), { sql: 'category_id IN ($1, $2)', params: [1, 3] });
  assert.deepStrictEqual(scopeFor(tecnico, { alias: 'i', startIndex: 3 }), { sql: 'i.category_id IN ($3, $4)', params: [1, 3] });
});

test('scopeFor: un tecnico sin categorias no ve nada y el solicitante solo lo suyo', () => {
  assert.deepStrictEqual(scopeFor(sinCategorias), { sql: '1 = 0', params: [] });
  assert.deepStrictEqual(scopeFor(solicitante, { alias: 'i', startIndex: 2 }), { sql: 'i.solicitante_id = $2', params: [1] });
});

test('canSee segun el rol', () => {
  const inc = { category_id: 1, solicitante_id: 1 };
  assert.ok(canSee(admin, inc));
  assert.ok(canSee(tecnico, inc));
  assert.ok(canSee(solicitante, inc));
  assert.ok(!canSee(tecnico, { category_id: 2, solicitante_id: 1 }), 'categoria que no atiende');
  assert.ok(!canSee(solicitante, { category_id: 1, solicitante_id: 9 }), 'incidente de otra persona');
  assert.ok(!canSee(sinCategorias, inc));
});

test('canOperate: administrador o tecnico asignado; nunca el solicitante', () => {
  assert.ok(canOperate(admin, { tecnico_id: null }));
  assert.ok(canOperate(tecnico, { tecnico_id: 2 }));
  assert.ok(!canOperate(tecnico, { tecnico_id: 9 }));
  assert.ok(!canOperate(tecnico, { tecnico_id: null }));
  assert.ok(!canOperate(solicitante, { tecnico_id: 1 }));
});

test('canAssign: solo el administrador', () => {
  assert.ok(canAssign(admin));
  assert.ok(!canAssign(tecnico));
  assert.ok(!canAssign(solicitante));
});
