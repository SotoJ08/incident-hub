// Que muestra la interfaz segun el rol. Solo decide botones y textos: el backend es quien autoriza (AB#384).
export const esAdmin = (user) => user?.rol === 'ADMIN';

// Asignar o reasignar tecnico: solo administradores
export const puedeAsignar = (user) => esAdmin(user);

// Cambiar estado: un administrador o el tecnico asignado al incidente
export function puedeOperar(user, incident) {
  if (esAdmin(user)) return true;
  return user?.rol === 'TECNICO' && incident.tecnico_id != null && incident.tecnico_id === user.id;
}

export const ROLES = { ADMIN: 'Administrador', TECNICO: 'Técnico', SOLICITANTE: 'Solicitante' };

// Descripcion de lo que el usuario puede ver, para mostrarla sobre la lista
export function alcance(user) {
  if (user?.rol === 'ADMIN') return 'Todos los incidentes';
  if (user?.rol === 'TECNICO') return 'Incidentes de las categorías que atiende';
  return 'Sus incidentes';
}
