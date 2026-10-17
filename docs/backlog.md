# Backlog (Azure Boards)

Proceso: **Agile**. Estimación en horas (Tasks) y puntos (Stories). Responsable: roles del equipo (ver README).
Total: 2 Epics, 4 Features, 8 User Stories, 16 Tasks.

## Epic 1 - Plataforma de gestión de incidentes

### Feature 1.1 - Registro y consulta de incidentes
**US1 - Crear incidente** (Prioridad 1, 3 pts, Backend)
- T1. Modelo de datos y migración de incidentes, usuarios y categorías (Prioridad 1, 4 h, Backend)
- T2. Endpoint POST/GET de incidente y formulario React (Prioridad 1, 6 h, Backend/Frontend)

**US2 - Consultar y filtrar incidentes** (Prioridad 1, 5 pts, Frontend)
- T3. Endpoint de listado con filtros por estado, prioridad, categoría y técnico (Prioridad 1, 4 h, Backend)
- T4. Vista de lista y filtros en React (Prioridad 2, 5 h, Frontend)

### Feature 1.2 - Operación, seguimiento e indicadores
**US3 - Asignar técnico y cambiar estado** (Prioridad 1, 5 pts, Backend)
- T5. Endpoint de asignación y validación de transiciones NUEVO -> ASIGNADO -> EN_PROCESO -> RESUELTO -> CERRADO (Prioridad 1, 5 h, Backend)
- T6. UI de asignación y cambio de estado (Prioridad 2, 5 h, Frontend)

**US4 - Comentarios y bitácora por incidente** (Prioridad 2, 3 pts, Backend)
- T7. Tabla y endpoint de comentarios, con eventos automáticos en la bitácora (Prioridad 2, 5 h, Backend)
- T8. UI de historial del incidente (Prioridad 2, 4 h, Frontend)

**US5 - Dashboard de indicadores** (Prioridad 2, 5 pts, Frontend)
- T9. Endpoint /stats: abiertos, cerrados, críticos, distribución por categoría y técnico (Prioridad 2, 4 h, Backend)
- T10. Dashboard en React (Prioridad 3, 5 h, Frontend)

## Epic 2 - Entrega continua DevOps

### Feature 2.1 - Pipeline de integración continua y calidad
**US6 - Pipeline CI en Azure Pipelines** (Prioridad 1, 8 pts, DevOps)
- T11. azure-pipelines.yml: checkout, instalación, build, pruebas, revisión de seguridad, empaquetado y artefacto; agente autohospedado (Prioridad 1, 8 h, DevOps)
- T12. Workflow de GitHub Actions para PR, lint y pruebas (Prioridad 2, 3 h, DevOps)

### Feature 2.2 - Seguridad y lanzamiento
**US7 - Seguridad: secretos y dependencias** (Prioridad 1, 5 pts, QA/Seguridad)
- T13. Análisis con npm audit y registro en docs/dependencies.md (Prioridad 2, 3 h, QA)
- T14. Secretos en variable group protegido y GitHub Secrets (Prioridad 1, 2 h, DevOps)

**US8 - Versionado y release v1.0.0** (Prioridad 2, 5 pts, DevOps)
- T15. Versionado SemVer y tags hasta v1.0.0 (Prioridad 2, 2 h, DevOps)
- T16. Ambientes dev/staging/prod con aprobaciones (Prioridad 2, 4 h, DevOps)
