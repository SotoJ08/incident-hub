const crypto = require('crypto');
const express = require('express');
const { authRouter } = require('./routes/auth');
const { incidentsRouter } = require('./routes/incidents');
const { incidentActionsRouter } = require('./routes/incident-actions');
const { incidentHistoryRouter } = require('./routes/incident-history');
const { statsRouter } = require('./routes/stats');
const { workflowRouter } = require('./routes/workflow-route');
const { catalogsRouter } = require('./routes/catalogs');

// Secreto de firma de los tokens: options.authSecret > AUTH_SECRET > uno aleatorio por proceso
// (con el aleatorio, las sesiones se invalidan al reiniciar el servidor).
function resolveSecret(options) {
  return options.authSecret || process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
}

// db: cualquier objeto con .query(sql, params) (pg.Pool en produccion, pg-mem en pruebas)
function createApp(db, options = {}) {
  const app = express();
  const secret = resolveSecret(options);
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter(db, secret));
  app.use('/api/incidents', incidentsRouter(db));
  app.use('/api/incidents', incidentActionsRouter(db));
  app.use('/api/incidents', incidentHistoryRouter(db));
  app.use('/api/stats', statsRouter(db));
  app.use('/api/workflow', workflowRouter());
  app.use('/api', catalogsRouter(db));
  app.use((req, res) => res.status(404).json({ errors: ['ruta no encontrada'] }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ errors: ['JSON invalido'] });
    console.error(err);
    res.status(500).json({ errors: ['error interno'] });
  });
  return app;
}

module.exports = { createApp };
