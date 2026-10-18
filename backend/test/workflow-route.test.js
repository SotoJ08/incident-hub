const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../src/app');
const { TRANSICIONES, ESTADOS_ASIGNABLES } = require('../src/workflow');

// La ruta no usa base de datos
const api = request(createApp({ query: async () => ({ rows: [] }) }));

test('GET /api/workflow devuelve exactamente las reglas del backend', async () => {
  const res = await api.get('/api/workflow');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.transiciones, TRANSICIONES);
  assert.deepStrictEqual(res.body.asignables, ESTADOS_ASIGNABLES);
});

test('incluye el catalogo de estados y prioridades', async () => {
  const res = await api.get('/api/workflow');
  assert.deepStrictEqual(res.body.estados, ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO']);
  assert.deepStrictEqual(res.body.prioridades, ['BAJA', 'MEDIA', 'ALTA', 'URGENTE', 'CRITICA']);
});

test('cada estado del catalogo tiene una entrada en transiciones', async () => {
  const { body } = await api.get('/api/workflow');
  for (const estado of body.estados) assert.ok(Array.isArray(body.transiciones[estado]), estado);
});
