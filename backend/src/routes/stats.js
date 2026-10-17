const express = require('express');
const { ESTADOS } = require('./incidents');

const n = (v) => Number(v);

// Indicadores del dashboard.
//   abiertos: estado distinto de CERRADO        cerrados: estado CERRADO
//   criticos: prioridad CRITICA y aun no CERRADO
//   por_categoria / por_tecnico incluyen elementos con 0 incidentes
function statsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const estados = await db.query('SELECT estado, COUNT(*) AS total FROM incidents GROUP BY estado');
      const criticos = await db.query("SELECT COUNT(*) AS total FROM incidents WHERE prioridad = 'CRITICA' AND estado <> 'CERRADO'");
      const sinAsignar = await db.query('SELECT COUNT(*) AS total FROM incidents WHERE tecnico_id IS NULL AND estado <> \'CERRADO\'');
      const categorias = await db.query(
        `SELECT c.id AS category_id, c.nombre, COUNT(i.id) AS total
         FROM categories c LEFT JOIN incidents i ON i.category_id = c.id
         GROUP BY c.id, c.nombre ORDER BY c.nombre`
      );
      const tecnicos = await db.query(
        `SELECT u.id AS tecnico_id, u.nombre, COUNT(i.id) AS total
         FROM users u LEFT JOIN incidents i ON i.tecnico_id = u.id
         WHERE u.rol = 'TECNICO' GROUP BY u.id, u.nombre ORDER BY u.nombre`
      );

      const porEstado = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
      for (const r of estados.rows) porEstado[r.estado] = n(r.total);
      const total = Object.values(porEstado).reduce((a, b) => a + b, 0);

      res.json({
        total,
        abiertos: total - porEstado.CERRADO,
        cerrados: porEstado.CERRADO,
        criticos: n(criticos.rows[0].total),
        sin_asignar: n(sinAsignar.rows[0].total),
        por_estado: porEstado,
        por_categoria: categorias.rows.map((r) => ({ ...r, total: n(r.total) })),
        por_tecnico: tecnicos.rows.map((r) => ({ ...r, total: n(r.total) })),
      });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { statsRouter };
