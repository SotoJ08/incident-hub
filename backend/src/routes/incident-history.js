const express = require('express');
const { canSee } = require('../access');

const TIPOS = ['COMENTARIO', 'CAMBIO_ESTADO', 'ASIGNACION'];
const MAX_COMENTARIO = 2000;

// Historial (bitacora) de un incidente: comentarios manuales y eventos automaticos
// generados al asignar o cambiar de estado. Solo lo ve quien puede ver el incidente;
// el autor de un comentario es siempre el usuario autenticado.
function incidentHistoryRouter(db) {
  const router = express.Router();

  async function findIncident(req, res) {
    if (!/^\d+$/.test(req.params.id)) { res.status(400).json({ errors: ['id invalido'] }); return null; }
    const { rows } = await db.query('SELECT id, estado, category_id, solicitante_id FROM incidents WHERE id = $1', [Number(req.params.id)]);
    if (!rows.length || !canSee(req.user, rows[0])) { res.status(404).json({ errors: ['incidente no encontrado'] }); return null; }
    return rows[0];
  }

  // Historial en orden cronologico; ?tipo= filtra por tipo de evento
  router.get('/:id/events', async (req, res, next) => {
    try {
      const incident = await findIncident(req, res);
      if (!incident) return;
      const { tipo } = req.query;
      if (tipo !== undefined && !TIPOS.includes(tipo)) {
        return res.status(400).json({ errors: [`tipo debe ser uno de: ${TIPOS.join(', ')}`] });
      }
      const params = [incident.id];
      let sql = `SELECT e.id, e.incident_id, e.tipo, e.detalle, e.created_at, e.autor_id, u.nombre AS autor
                 FROM incident_events e JOIN users u ON u.id = e.autor_id
                 WHERE e.incident_id = $1`;
      if (tipo) { params.push(tipo); sql += ' AND e.tipo = $2'; }
      sql += ' ORDER BY e.created_at ASC, e.id ASC';
      const { rows } = await db.query(sql, params);
      res.json(rows);
    } catch (e) { next(e); }
  });

  router.post('/:id/comments', async (req, res, next) => {
    try {
      const incident = await findIncident(req, res);
      if (!incident) return;
      const { comentario } = req.body || {};
      if (typeof comentario !== 'string' || comentario.trim().length === 0) {
        return res.status(400).json({ errors: ['comentario es obligatorio'] });
      }
      if (comentario.trim().length > MAX_COMENTARIO) {
        return res.status(400).json({ errors: [`comentario admite maximo ${MAX_COMENTARIO} caracteres`] });
      }
      if (incident.estado === 'CERRADO') {
        return res.status(409).json({ errors: ['no se puede comentar un incidente CERRADO'] });
      }
      const { rows } = await db.query(
        "INSERT INTO incident_events (incident_id, autor_id, tipo, detalle) VALUES ($1, $2, 'COMENTARIO', $3) RETURNING *",
        [incident.id, req.user.id, comentario.trim()]
      );
      res.status(201).json(rows[0]);
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { incidentHistoryRouter, TIPOS, MAX_COMENTARIO };
