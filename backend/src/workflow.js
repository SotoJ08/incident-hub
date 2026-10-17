// Ciclo de vida de un incidente: NUEVO -> ASIGNADO -> EN_PROCESO -> RESUELTO -> CERRADO
// Un incidente RESUELTO puede reabrirse a EN_PROCESO; CERRADO es terminal.
const TRANSICIONES = {
  NUEVO: ['ASIGNADO'],
  ASIGNADO: ['EN_PROCESO'],
  EN_PROCESO: ['RESUELTO'],
  RESUELTO: ['CERRADO', 'EN_PROCESO'],
  CERRADO: [],
};

// Estados en los que aun se puede asignar o reasignar un tecnico
const ESTADOS_ASIGNABLES = ['NUEVO', 'ASIGNADO', 'EN_PROCESO'];

const puedeTransicionar = (desde, hacia) => (TRANSICIONES[desde] || []).includes(hacia);
const puedeAsignar = (estado) => ESTADOS_ASIGNABLES.includes(estado);

module.exports = { TRANSICIONES, ESTADOS_ASIGNABLES, puedeTransicionar, puedeAsignar };
