const express = require('express');
const { hashPassword, verifyPassword, signToken } = require('../auth');
const { requireAuth, loadUser } = require('../middleware/auth');

// Hash de relleno: para un correo inexistente tambien se calcula un scrypt y la respuesta
// tarda lo mismo, de modo que no se puede saber que correos existen midiendo tiempos.
const HASH_RELLENO = hashPassword('relleno', '00000000000000000000000000000000');
const CREDENCIALES_INVALIDAS = 'credenciales invalidas';

function authRouter(db, secret) {
  const router = express.Router();

  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        return res.status(400).json({ errors: ['email y password son obligatorios'] });
      }
      const { rows } = await db.query('SELECT id, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()]);
      const usuario = rows[0];
      const ok = verifyPassword(password, usuario ? usuario.password_hash : HASH_RELLENO);
      if (!usuario || !usuario.password_hash || !ok) return res.status(401).json({ errors: [CREDENCIALES_INVALIDAS] });
      const user = await loadUser(db, usuario.id);
      res.json({ token: signToken({ sub: user.id, rol: user.rol }, secret), user });
    } catch (e) { next(e); }
  });

  router.get('/me', requireAuth(db, secret), (req, res) => res.json({ user: req.user }));

  return router;
}

module.exports = { authRouter };
