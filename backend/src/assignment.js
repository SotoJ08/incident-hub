// Asignacion automatica por categoria (AB#386): un incidente nuevo va al tecnico que atiende
// su categoria y tiene menos incidentes abiertos (a igual carga, el de menor id).

// Tecnicos que atienden una categoria, con su carga actual (incidentes no cerrados)
async function candidatos(db, categoryId) {
  const tecnicos = await db.query(
    `SELECT u.id, u.nombre FROM users u
     JOIN tecnico_categorias tc ON tc.user_id = u.id
     WHERE u.rol = 'TECNICO' AND tc.category_id = $1`,
    [categoryId]
  );
  const resultado = [];
  for (const t of tecnicos.rows) {
    const carga = await db.query(
      "SELECT COUNT(*) AS total FROM incidents WHERE tecnico_id = $1 AND estado <> 'CERRADO'",
      [t.id]
    );
    resultado.push({ id: Number(t.id), nombre: t.nombre, carga: Number(carga.rows[0].total) });
  }
  return resultado;
}

function elegir(lista) {
  return [...lista].sort((a, b) => a.carga - b.carga || a.id - b.id)[0] || null;
}

// Asigna el incidente recien creado. Devuelve el incidente actualizado o el mismo si la categoria no tiene tecnico.
async function autoAssign(db, incident, autorId) {
  const elegido = elegir(await candidatos(db, incident.category_id));
  if (!elegido) return incident;
  const { rows } = await db.query(
    "UPDATE incidents SET tecnico_id = $1, estado = 'ASIGNADO', updated_at = now() WHERE id = $2 RETURNING *",
    [elegido.id, incident.id]
  );
  await db.query(
    "INSERT INTO incident_events (incident_id, autor_id, tipo, detalle) VALUES ($1, $2, 'ASIGNACION', $3)",
    [incident.id, autorId, `Asignacion automatica a ${elegido.nombre} (atiende la categoria; carga previa: ${elegido.carga})`]
  );
  return rows[0];
}

module.exports = { autoAssign, candidatos, elegir };
