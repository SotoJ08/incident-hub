const express = require('express');

// Catalogos de solo lectura que alimentan los filtros y formularios del frontend
function catalogsRouter(db) {
  const router = express.Router();

  router.get('/categories', async (req, res, next) => {
    try {
      const { rows } = await db.query('SELECT id, nombre, parent_id FROM categories ORDER BY nombre');
      res.json(rows);
    } catch (e) { next(e); }
  });

  router.get('/users', async (req, res, next) => {
    try {
      const { rol } = req.query;
      if (rol !== undefined && !['SOLICITANTE', 'TECNICO', 'ADMIN'].includes(rol)) {
        return res.status(400).json({ errors: ['rol invalido'] });
      }
      const { rows } = rol
        ? await db.query('SELECT id, nombre, rol FROM users WHERE rol = $1 ORDER BY nombre', [rol])
        : await db.query('SELECT id, nombre, rol FROM users ORDER BY nombre');
      res.json(rows);
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { catalogsRouter };
