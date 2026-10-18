const express = require('express');
const { TRANSICIONES, ESTADOS_ASIGNABLES } = require('../workflow');
const { ESTADOS, PRIORIDADES } = require('./incidents');

// Expone las reglas del flujo para que el frontend no las duplique (AB#362)
function workflowRouter() {
  const router = express.Router();
  router.get('/', (req, res) => {
    res.json({ estados: ESTADOS, prioridades: PRIORIDADES, transiciones: TRANSICIONES, asignables: ESTADOS_ASIGNABLES });
  });
  return router;
}

module.exports = { workflowRouter };
