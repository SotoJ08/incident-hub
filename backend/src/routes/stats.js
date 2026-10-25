const express = require('express');
const { ESTADOS } = require('./incidents');
const { scopeFor } = require('../access');

const n = (v) => Number(v);

// Indicadores del dashboard, limitados a lo que el usuario puede ver (access.scopeFor).
//   abiertos: estado distinto de CERRADO        cerrados: estado CERRADO
//   criticos: prioridad CRITICA y aun no CERRADO
//   por_categoria / por_tecnico incluyen elementos con 0 incidentes
//   (un tecnico solo ve en por_categoria las categorias que atiende)
function statsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const scope = scopeFor(req.user, { alias: 'i' });
      const and = scope.sql ? ` AND ${scope.sql}` : '';
      const p = scope.params;

      const estados = await db.query(`SELECT i.estado, COUNT(*) AS total FROM incidents i WHERE 1 = 1${and} GROUP BY i.estado`, p);
      const criticos = await db.query(`SELECT COUNT(*) AS total FROM incidents i WHERE i.prioridad = 'CRITICA' AND i.estado <> 'CERRADO'${and}`, p);
      const sinAsignar = await db.query(`SELECT COUNT(*) AS total FROM incidents i WHERE i.tecnico_id IS NULL AND i.estado <> 'CERRADO'${and}`, p);
      const categorias = await db.query(
        `SELECT c.id AS category_id, c.nombre, COUNT(i.id) AS total
         FROM categories c LEFT JOIN incidents i ON i.category_id = c.id${and}
         GROUP BY c.id, c.nombre ORDER BY c.nombre`,
        p
      );
      const tecnicos = await db.query(
        `SELECT u.id AS tecnico_id, u.nombre, COUNT(i.id) AS total
         FROM users u LEFT JOIN incidents i ON i.tecnico_id = u.id${and}
         WHERE u.rol = 'TECNICO' GROUP BY u.id, u.nombre ORDER BY u.nombre`,
        p
      );

      const porEstado = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
      for (const r of estados.rows) porEstado[r.estado] = n(r.total);
      const total = Object.values(porEstado).reduce((a, b) => a + b, 0);
      const propias = req.user.rol === 'TECNICO' ? new Set(req.user.categorias) : null;

      res.json({
        total,
        abiertos: total - porEstado.CERRADO,
        cerrados: porEstado.CERRADO,
        criticos: n(criticos.rows[0].total),
        sin_asignar: n(sinAsignar.rows[0].total),
        por_estado: porEstado,
        por_categoria: categorias.rows
          .filter((r) => !propias || propias.has(n(r.category_id)))
          .map((r) => ({ ...r, total: n(r.total) })),
        por_tecnico: tecnicos.rows.map((r) => ({ ...r, total: n(r.total) })),
      });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { statsRouter };
