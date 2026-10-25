// Utilidades de prueba: base pg-mem con migraciones y seed, y clientes HTTP autenticados por usuario.
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { newDb } = require('pg-mem');
const { migrate } = require('../src/migrate');
const { createApp } = require('../src/app');
const { signToken } = require('../src/auth');

const SECRETO = 'secreto-de-prueba';

// Ids de los usuarios del seed (database/seed.sql)
//   Tecnicos: LUIS atiende categoria 1, MARTA las 2 y 3, CARLOS la 4. La categoria 5 (Otros) no tiene tecnico.
const USUARIOS = { ANA: 1, LUIS: 2, MARTA: 3, ADMIN: 4, CARLOS: 5, PEDRO: 6 };

// Devuelve un objeto con get/post/patch que agregan el token del usuario indicado
function cliente(app, userId) {
  const token = signToken({ sub: userId }, SECRETO);
  const con = (metodo) => (url) => request(app)[metodo](url).set('Authorization', `Bearer ${token}`);
  return { get: con('get'), post: con('post'), patch: con('patch') };
}

async function crearEntorno() {
  const { Client } = newDb().adapters.createPg();
  const db = new Client();
  await db.connect();
  await migrate(db);
  await db.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8'));
  const app = createApp(db, { authSecret: SECRETO });
  return { db, app, anon: request(app), as: (userId) => cliente(app, userId), admin: cliente(app, USUARIOS.ADMIN) };
}

// Inserta un incidente directamente (sin pasar por la API ni la asignacion automatica)
async function insertarIncidente(db, datos = {}) {
  const d = { titulo: 't', descripcion: 'd', category_id: 1, prioridad: 'BAJA', estado: 'NUEVO', solicitante_id: USUARIOS.ANA, tecnico_id: null, ...datos };
  const { rows } = await db.query(
    `INSERT INTO incidents (titulo, descripcion, category_id, prioridad, estado, solicitante_id, tecnico_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [d.titulo, d.descripcion, d.category_id, d.prioridad, d.estado, d.solicitante_id, d.tecnico_id]
  );
  return rows[0];
}

module.exports = { SECRETO, USUARIOS, crearEntorno, insertarIncidente, cliente };
