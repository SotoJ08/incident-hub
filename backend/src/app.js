const express = require('express');
const { incidentsRouter } = require('./routes/incidents');
const { incidentActionsRouter } = require('./routes/incident-actions');
const { incidentHistoryRouter } = require('./routes/incident-history');
const { catalogsRouter } = require('./routes/catalogs');

// db: cualquier objeto con .query(sql, params) (pg.Pool en produccion, pg-mem en pruebas)
function createApp(db) {
  const app = express();
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/incidents', incidentsRouter(db));
  app.use('/api/incidents', incidentActionsRouter(db));
  app.use('/api/incidents', incidentHistoryRouter(db));
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
