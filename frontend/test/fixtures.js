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

// Usuarios autenticados de ejemplo (mismos ids y categorias que database/seed.sql)
export const ADMIN = { id: 4, nombre: 'Admin TI', email: 'admin@example.com', rol: 'ADMIN', categorias: [] };
export const TECNICO = { id: 2, nombre: 'Luis Tecnico', email: 'luis@example.com', rol: 'TECNICO', categorias: [1] };
export const SOLICITANTE = { id: 1, nombre: 'Ana Solicitante', email: 'ana@example.com', rol: 'SOLICITANTE', categorias: [] };

// Respuesta de GET /api/users?rol=TECNICO (incluye las categorias que atiende cada uno)
export const TECNICOS = [
  { id: 2, nombre: 'Luis Tecnico', rol: 'TECNICO', categorias: [1] },
  { id: 3, nombre: 'Marta Tecnica', rol: 'TECNICO', categorias: [2, 3] },
  { id: 5, nombre: 'Carlos Teleco', rol: 'TECNICO', categorias: [4] },
];

export const CATEGORIAS = [
  { id: 1, nombre: 'Equipo de computo', parent_id: null },
  { id: 2, nombre: 'Sistema Institucional', parent_id: null },
  { id: 4, nombre: 'Telecomunicaciones', parent_id: null },
];

// Token de prueba armado en tiempo de ejecucion: no hay valores con forma de token en el repositorio
export const TOKEN_FALSO = ['falso', 'sin', 'valor'].join('.');
export const CLAVE_PRUEBA = ['clave', 'de', 'prueba'].join('-'); // contrasena falsa de las pruebas
