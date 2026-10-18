// Respuesta de GET /api/workflow (reglas definidas en backend/src/workflow.js)
export const WORKFLOW = {
  estados: ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'],
  prioridades: ['BAJA', 'MEDIA', 'ALTA', 'URGENTE', 'CRITICA'],
  transiciones: {
    NUEVO: ['ASIGNADO'],
    ASIGNADO: ['EN_PROCESO'],
    EN_PROCESO: ['RESUELTO'],
    RESUELTO: ['CERRADO', 'EN_PROCESO'],
    CERRADO: [],
  },
  asignables: ['NUEVO', 'ASIGNADO', 'EN_PROCESO'],
};
