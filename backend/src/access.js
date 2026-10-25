// Reglas de acceso por rol (AB#383). Funciones puras: no tocan la base de datos.
//   ADMIN       ve y gestiona todos los incidentes.
//   TECNICO     ve los incidentes de las categorias que atiende y opera (cambia estado) solo los que tiene asignados.
//   SOLICITANTE ve solo los incidentes que reporto.

// Condicion SQL de visibilidad y sus parametros, lista para anexar con AND.
// alias: prefijo de la tabla incidents; startIndex: primer marcador $n libre.
function scopeFor(user, { alias = '', startIndex = 1 } = {}) {
  const col = (c) => (alias ? `${alias}.${c}` : c);
  if (user.rol === 'ADMIN') return { sql: '', params: [] };
  if (user.rol === 'TECNICO') {
    const cats = user.categorias || [];
    if (!cats.length) return { sql: '1 = 0', params: [] };
    const marcadores = cats.map((_, i) => `$${startIndex + i}`).join(', ');
    return { sql: `${col('category_id')} IN (${marcadores})`, params: [...cats] };
  }
  return { sql: `${col('solicitante_id')} = $${startIndex}`, params: [user.id] };
}

function canSee(user, incident) {
  if (user.rol === 'ADMIN') return true;
  if (user.rol === 'TECNICO') return (user.categorias || []).includes(Number(incident.category_id));
  return Number(incident.solicitante_id) === Number(user.id);
}

// Cambiar el estado: un administrador, o el tecnico que tiene asignado el incidente
function canOperate(user, incident) {
  if (user.rol === 'ADMIN') return true;
  return user.rol === 'TECNICO' && incident.tecnico_id != null && Number(incident.tecnico_id) === Number(user.id);
}

// Asignar o reasignar: solo administradores
const canAssign = (user) => user.rol === 'ADMIN';

module.exports = { scopeFor, canSee, canOperate, canAssign };
