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
      // Los tecnicos incluyen las categorias que atienden (la interfaz solo ofrece asignar a quien corresponde)
      const cats = await db.query('SELECT user_id, category_id FROM tecnico_categorias ORDER BY category_id');
      const porUsuario = new Map();
      for (const c of cats.rows) porUsuario.set(Number(c.user_id), [...(porUsuario.get(Number(c.user_id)) || []), Number(c.category_id)]);
      res.json(rows.map((u) => (u.rol === 'TECNICO' ? { ...u, categorias: porUsuario.get(Number(u.id)) || [] } : u)));
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { catalogsRouter };
