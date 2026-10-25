const { verifyToken } = require('../auth');

// Lee el usuario y, si es tecnico, las categorias que atiende
async function loadUser(db, id) {
  const { rows } = await db.query('SELECT id, nombre, email, rol FROM users WHERE id = $1', [id]);
  if (!rows.length) return null;
  const user = rows[0];
  const cats = await db.query('SELECT category_id FROM tecnico_categorias WHERE user_id = $1 ORDER BY category_id', [id]);
  return { ...user, categorias: cats.rows.map((r) => Number(r.category_id)) };
}

// Exige "Authorization: Bearer <token>" valido; deja el usuario actual en req.user.
// Siempre vuelve a leer al usuario de la base: un cambio de rol o de categorias aplica de inmediato.
function requireAuth(db, secret) {
  return async (req, res, next) => {
    try {
      const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
      const payload = m && verifyToken(m[1], secret);
      if (!payload) return res.status(401).json({ errors: ['no autenticado'] });
      const user = await loadUser(db, payload.sub);
      if (!user) return res.status(401).json({ errors: ['no autenticado'] });
      req.user = user;
      next();
    } catch (e) { next(e); }
  };
}

module.exports = { requireAuth, loadUser };
