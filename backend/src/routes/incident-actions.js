const express = require('express');
const { ESTADOS } = require('./incidents');
const { TRANSICIONES, puedeTransicionar, puedeAsignar } = require('../workflow');
const { canSee, canOperate, canAssign } = require('../access');

// Acciones de operacion sobre un incidente: asignar tecnico y cambiar estado.
// Quien actua es el usuario autenticado (req.user); cada accion deja un evento en la bitacora.
//   assign: solo ADMIN, y el tecnico debe atender la categoria del incidente.
//   status: ADMIN o el tecnico asignado al incidente.
function incidentActionsRouter(db) {
  const router = express.Router();

  // Devuelve el incidente si existe y el usuario puede verlo; si no, responde 400/404 y devuelve null
  async function loadIncident(req, res) {
    if (!/^\d+$/.test(req.params.id)) { res.status(400).json({ errors: ['id invalido'] }); return null; }
    const inc = await db.query('SELECT * FROM incidents WHERE id = $1', [Number(req.params.id)]);
    if (!inc.rows.length || !canSee(req.user, inc.rows[0])) {
      res.status(404).json({ errors: ['incidente no encontrado'] });
      return null;
    }
    return inc.rows[0];
  }

  router.patch('/:id/assign', async (req, res, next) => {
    try {
      const incident = await loadIncident(req, res);
      if (!incident) return;
      if (!canAssign(req.user)) return res.status(403).json({ errors: ['solo un administrador puede asignar tecnicos'] });
      const { tecnico_id } = req.body || {};
      if (!Number.isInteger(tecnico_id)) return res.status(400).json({ errors: ['tecnico_id debe ser un entero'] });
      const tec = await db.query('SELECT id, nombre, rol FROM users WHERE id = $1', [tecnico_id]);
      if (!tec.rows.length) return res.status(400).json({ errors: ['tecnico_id no existe'] });
      if (tec.rows[0].rol !== 'TECNICO') return res.status(400).json({ errors: ['el usuario asignado debe tener rol TECNICO'] });
      const atiende = await db.query(
        'SELECT user_id FROM tecnico_categorias WHERE user_id = $1 AND category_id = $2',
        [tecnico_id, incident.category_id]
      );
      if (!atiende.rows.length) {
        return res.status(400).json({ errors: ['el tecnico no atiende la categoria de este incidente'] });
      }
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
        [incident.id, req.user.id, detalle]
      );
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

  router.patch('/:id/status', async (req, res, next) => {
    try {
      const incident = await loadIncident(req, res);
      if (!incident) return;
      if (!canOperate(req.user, incident)) {
        return res.status(403).json({ errors: ['solo un administrador o el tecnico asignado puede cambiar el estado'] });
      }
      const { estado } = req.body || {};
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
        [incident.id, req.user.id, `${incident.estado} -> ${estado}`]
      );
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { incidentActionsRouter };
