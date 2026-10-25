const express = require('express');
const { scopeFor, canSee } = require('../access');
const { autoAssign } = require('../assignment');

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE', 'CRITICA'];
const ESTADOS = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];
const ORDEN_LISTADO = 'created_at DESC, id DESC';

// El solicitante no se envia: es la persona autenticada (req.user)
function validateNew(body) {
  const errors = [];
  const text = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!text(body.titulo) || body.titulo.length > 200) errors.push('titulo es obligatorio (max 200 caracteres)');
  if (!text(body.descripcion)) errors.push('descripcion es obligatoria');
  if (!Number.isInteger(body.category_id)) errors.push('category_id debe ser un entero');
  if (body.prioridad !== undefined && !PRIORIDADES.includes(body.prioridad)) {
    errors.push(`prioridad debe ser una de: ${PRIORIDADES.join(', ')}`);
  }
  return errors;
}

function incidentsRouter(db) {
  const router = express.Router();

  // Crea el incidente a nombre del usuario autenticado y, si la categoria tiene tecnico, lo asigna solo
  router.post('/', async (req, res, next) => {
    try {
      const errors = validateNew(req.body || {});
      if (errors.length) return res.status(400).json({ errors });
      const { titulo, descripcion, category_id, prioridad = 'BAJA' } = req.body;
      const cat = await db.query('SELECT id FROM categories WHERE id = $1', [category_id]);
      if (!cat.rows.length) return res.status(400).json({ errors: ['category_id no existe'] });
      const { rows } = await db.query(
        `INSERT INTO incidents (titulo, descripcion, category_id, prioridad, solicitante_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [titulo.trim(), descripcion.trim(), category_id, prioridad, req.user.id]
      );
      res.status(201).json(await autoAssign(db, rows[0], req.user.id));
    } catch (e) { next(e); }
  });

  // Filtros opcionales: estado, prioridad, category_id, tecnico_id (se combinan con AND).
  // Cada rol ve solo lo que le corresponde (access.scopeFor).
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
      const scope = scopeFor(req.user, { startIndex: params.length + 1 });
      if (scope.sql) { where.push(scope.sql); params.push(...scope.params); }
      const sql = `SELECT * FROM incidents${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${ORDEN_LISTADO}`;
      const { rows } = await db.query(sql, params);
      res.json(rows);
    } catch (e) { next(e); }
  });

  // Un incidente fuera del alcance del usuario responde 404 (no se revela que existe)
  router.get('/:id', async (req, res, next) => {
    try {
      if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ errors: ['id invalido'] });
      const { rows } = await db.query('SELECT * FROM incidents WHERE id = $1', [Number(req.params.id)]);
      if (!rows.length || !canSee(req.user, rows[0])) return res.status(404).json({ errors: ['incidente no encontrado'] });
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { incidentsRouter, PRIORIDADES, ESTADOS };
