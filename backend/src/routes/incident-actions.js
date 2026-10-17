const express = require('express');
const { ESTADOS } = require('./incidents');
const { TRANSICIONES, puedeTransicionar, puedeAsignar } = require('../workflow');

// Acciones de operacion sobre un incidente: asignar tecnico y cambiar estado.
// Cada accion deja un evento en la bitacora (incident_events).
// autor_id identifica quien actua; la autenticacion llegara en una historia posterior.
function incidentActionsRouter(db) {
  const router = express.Router();

  async function loadContext(req, res) {
    if (!/^\d+$/.test(req.params.id)) { res.status(400).json({ errors: ['id invalido'] }); return null; }
    const { autor_id } = req.body || {};
    if (!Number.isInteger(autor_id)) { res.status(400).json({ errors: ['autor_id debe ser un entero'] }); return null; }
    const autor = await db.query('SELECT id FROM users WHERE id = $1', [autor_id]);
    if (!autor.rows.length) { res.status(400).json({ errors: ['autor_id no existe'] }); return null; }
    const inc = await db.query('SELECT * FROM incidents WHERE id = $1', [Number(req.params.id)]);
    if (!inc.rows.length) { res.status(404).json({ errors: ['incidente no encontrado'] }); return null; }
    return inc.rows[0];
  }

  router.patch('/:id/assign', async (req, res, next) => {
    try {
      const incident = await loadContext(req, res);
      if (!incident) return;
      const { tecnico_id, autor_id } = req.body;
      if (!Number.isInteger(tecnico_id)) return res.status(400).json({ errors: ['tecnico_id debe ser un entero'] });
      const tec = await db.query('SELECT id, nombre, rol FROM users WHERE id = $1', [tecnico_id]);
      if (!tec.rows.length) return res.status(400).json({ errors: ['tecnico_id no existe'] });
      if (tec.rows[0].rol !== 'TECNICO') return res.status(400).json({ errors: ['el usuario asignado debe tener rol TECNICO'] });
      if (!puedeAsignar(incident.estado)) {
        return res.status(409).json({ errors: [`no se puede asignar un incidente en estado ${incident.estado}`] });
      }
      // Un incidente NUEVO pasa a ASIGNADO; en otros estados solo cambia el tecnico
      const nuevoEstado = incident.estado === 'NUEVO' ? 'ASIGNADO' : incident.estado;
      const { rows } = await db.query(
        'UPDATE incidents SET tecnico_id = $1, estado = $2, updated_at = now() WHERE id = $3 RETURNING *',
        [tecnico_id, nuevoEstado, incident.id]
      );
      const detalle = incident.tecnico_id
        ? `Reasignado de tecnico ${incident.tecnico_id} a ${tec.rows[0].nombre}`
        : `Asignado a ${tec.rows[0].nombre}`;
      await db.query(
        "INSERT INTO incident_events (incident_id, autor_id, tipo, detalle) VALUES ($1, $2, 'ASIGNACION', $3)",
        [incident.id, autor_id, detalle]
      );
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

  router.patch('/:id/status', async (req, res, next) => {
    try {
      const incident = await loadContext(req, res);
      if (!incident) return;
      const { estado, autor_id } = req.body;
      if (!ESTADOS.includes(estado)) return res.status(400).json({ errors: [`estado debe ser uno de: ${ESTADOS.join(', ')}`] });
      if (!puedeTransicionar(incident.estado, estado)) {
        return res.status(409).json({
          errors: [`transicion invalida: ${incident.estado} -> ${estado}`],
          permitidos: TRANSICIONES[incident.estado],
        });
      }
      if (incident.tecnico_id == null) {
        return res.status(409).json({ errors: ['el incidente debe tener un tecnico asignado'] });
      }
      const { rows } = await db.query(
        'UPDATE incidents SET estado = $1, updated_at = now() WHERE id = $2 RETURNING *',
        [estado, incident.id]
      );
      await db.query(
        "INSERT INTO incident_events (incident_id, autor_id, tipo, detalle) VALUES ($1, $2, 'CAMBIO_ESTADO', $3)",
        [incident.id, autor_id, `${incident.estado} -> ${estado}`]
      );
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { incidentActionsRouter };
