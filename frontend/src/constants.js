export const ESTADOS = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];
export const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE', 'CRITICA'];

// Espejo de backend/src/workflow.js: solo decide que botones mostrar; el backend es quien valida.
export const TRANSICIONES = {
  NUEVO: ['ASIGNADO'],
  ASIGNADO: ['EN_PROCESO'],
  EN_PROCESO: ['RESUELTO'],
  RESUELTO: ['CERRADO', 'EN_PROCESO'],
  CERRADO: [],
};
export const ESTADOS_ASIGNABLES = ['NUEVO', 'ASIGNADO', 'EN_PROCESO'];
