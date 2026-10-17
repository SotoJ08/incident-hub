const express = require('express');

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE', 'CRITICA'];
const ESTADOS = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];
const ORDEN_LISTADO = 'created_at DESC, id DESC';

function validateNew(body) {
  const errors = [];
  const text = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!text(body.titulo) || body.titulo.length > 200) errors.push('titulo es obligatorio (max 200 caracteres)');
  if (!text(body.descripcion)) errors.push('descripcion es obligatoria');
  if (!Number.isInteger(body.category_id)) errors.push('category_id debe ser un entero');
  if (!Number.isInteger(body.solicitante_id)) errors.push('solicitante_id debe ser un entero');
  if (body.prioridad !== undefined && !PRIORIDADES.includes(body.prioridad)) {
    errors.push(`prioridad debe ser una de: ${PRIORIDADES.join(', ')}`);
  }
  return errors;
}

function incidentsRouter(db) {
  const router = express.Router();

  router.post('/', async (req, res, next) => {
    try {
      const errors = validateNew(req.body || {});
      if (errors.length) return res.status(400).json({ errors });
      const { titulo, descripcion, category_id, solicitante_id, prioridad = 'BAJA' } = req.body;
      const refs = await db.query(
        'SELECT (SELECT COUNT(*) FROM categories WHERE id = $1) AS c, (SELECT COUNT(*) FROM users WHERE id = $2) AS u',
        [category_id, solicitante_id]
      );
      if (Number(refs.rows[0].c) === 0) return res.status(400).json({ errors: ['category_id no existe'] });
      if (Number(refs.rows[0].u) === 0) return res.status(400).json({ errors: ['solicitante_id no existe'] });
      const { rows } = await db.query(
        `INSERT INTO incidents (titulo, descripcion, category_id, prioridad, solicitante_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [titulo.trim(), descripcion.trim(), category_id, prioridad, solicitante_id]
      );
      res.status(201).json(rows[0]);
    } catch (e) { next(e); }
  });

  // Filtros opcionales: estado, prioridad, category_id, tecnico_id (se combinan con AND)
  router.get('/', async (req, res, next) => {
    try {
      const { estado, prioridad, category_id, tecnico_id } = req.query;
      const errors = [];
      const where = [];
      const params = [];
      const add = (col, value) => { params.push(value); where.push(`${col} = $${params.length}`); };
      if (estado !== undefined) {
        if (!ESTADOS.includes(estado)) errors.push(`estado debe ser uno de: ${ESTADOS.join(', ')}`);
        else add('estado', estado);
      }
      if (prioridad !== undefined) {
        if (!PRIORIDADES.includes(prioridad)) errors.push(`prioridad debe ser una de: ${PRIORIDADES.join(', ')}`);
        else add('prioridad', prioridad);
      }
      for (const [name, value] of [['category_id', category_id], ['tecnico_id', tecnico_id]]) {
        if (value === undefined) continue;
        if (!/^\d+$/.test(String(value))) errors.push(`${name} debe ser un entero`);
        else add(name, Number(value));
      }
      if (errors.length) return res.status(400).json({ errors });
      const sql = `SELECT * FROM incidents${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${ORDEN_LISTADO}`;
      const { rows } = await db.query(sql, params);
      res.json(rows);
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ errors: ['id invalido'] });
      const { rows } = await db.query('SELECT * FROM incidents WHERE id = $1', [Number(req.params.id)]);
      if (!rows.length) return res.status(404).json({ errors: ['incidente no encontrado'] });
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { incidentsRouter, PRIORIDADES, ESTADOS };
