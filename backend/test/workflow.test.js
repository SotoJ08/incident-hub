const test = require('node:test');
const assert = require('node:assert');
const { TRANSICIONES, puedeTransicionar, puedeAsignar } = require('../src/workflow');

test('el flujo feliz avanza paso a paso', () => {
  assert.ok(puedeTransicionar('NUEVO', 'ASIGNADO'));
  assert.ok(puedeTransicionar('ASIGNADO', 'EN_PROCESO'));
  assert.ok(puedeTransicionar('EN_PROCESO', 'RESUELTO'));
  assert.ok(puedeTransicionar('RESUELTO', 'CERRADO'));
});

test('permite reabrir un incidente RESUELTO', () => {
  assert.ok(puedeTransicionar('RESUELTO', 'EN_PROCESO'));
});

test('no permite saltos ni retrocesos fuera de lo definido', () => {
  assert.ok(!puedeTransicionar('NUEVO', 'EN_PROCESO'));
  assert.ok(!puedeTransicionar('NUEVO', 'CERRADO'));
  assert.ok(!puedeTransicionar('EN_PROCESO', 'ASIGNADO'));
  assert.ok(!puedeTransicionar('ASIGNADO', 'NUEVO'));
});

test('CERRADO es terminal', () => {
  assert.deepStrictEqual(TRANSICIONES.CERRADO, []);
  assert.ok(!puedeTransicionar('CERRADO', 'EN_PROCESO'));
});

test('solo se asigna en NUEVO, ASIGNADO y EN_PROCESO', () => {
  assert.ok(puedeAsignar('NUEVO') && puedeAsignar('ASIGNADO') && puedeAsignar('EN_PROCESO'));
  assert.ok(!puedeAsignar('RESUELTO') && !puedeAsignar('CERRADO'));
});
