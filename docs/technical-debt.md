# Deuda técnica

Registro de la deuda técnica **real** detectada durante el desarrollo. Cada elemento tiene un Work Item en Azure Boards
(hijo de la User Story AB#360 "Gestionar y reducir la deuda técnica", etiqueta `deuda-tecnica`).
Meta del proyecto: identificar al menos 5 y resolver al menos 2 con trabajo trazable. **Estado actual: 11 identificadas, 3 resueltas.**

## Resumen

| # | Deuda | Impacto | Estado | Work Item | Evidencia |
|---|---|---|---|---|---|
| D1 | `NodeTool@0` está deprecado en el pipeline | Medio: la tarea deja de recibir actualizaciones | **Resuelta** | AB#361 | PR #15, run #25 sin advertencia de deprecación |
| D2 | Reglas de transición duplicadas en frontend y backend | Medio: un cambio exige editar dos lugares y pueden divergir | **Resuelta** | AB#362 | PR #16, `GET /api/workflow`, copia local eliminada |
| D3 | Actualización del incidente y evento de bitácora sin transacción | Alto: un fallo intermedio deja el incidente sin su evento | Abierta | AB#363 | Dos consultas separadas en `incident-actions.js` (y ahora también en la asignación automática) |
| D4 | Pruebas con pg-mem en vez de PostgreSQL real | Alto: no se verifica comportamiento transaccional ni SQL propio de PostgreSQL | Abierta | AB#364 | Se comprobó que en pg-mem `ROLLBACK` no revierte; bloquea resolver D3 con pruebas fiables |
| D5 | Sin autenticación: `autor_id` y `solicitante_id` los envía el cliente | Alto (seguridad): cualquiera puede actuar como otro usuario | **Resuelta** | AB#365 | v1.1.0: login con scrypt y token HS256, 3 roles, permisos por rol; el autor sale del token (Feature AB#375, PR #26, #27 y #28) |
| D6 | Sin lint en backend ni frontend | Bajo: sin reglas de estilo ni análisis estático en el CI | Abierta | AB#366 | El CI solo ejecuta build, pruebas y audit |
| D7 | `GET /api/incidents` sin paginación | Medio: no escala con miles de incidentes | Abierta | AB#367 | Devuelve todas las filas visibles |
| D8 | El pipeline de Azure no valida los PR automáticamente | Medio: la validación depende de lanzar corridas a mano | Abierta | AB#368 | El bloque `pr:` no aplica a Azure Repos; falta política de rama con *build validation* |
| D9 | El filtro por categoría no incluye subcategorías | Bajo: filtrar por una categoría padre omite incidentes de sus hijas | Abierta | AB#369 | Filtro por igualdad exacta de `category_id`; además los técnicos se asignan por categoría exacta |
| D10 | Sin límite de intentos de login ni bloqueo de cuentas | Medio (seguridad): permite fuerza bruta contra contraseñas | Abierta | (a registrar) | Ver `docs/security.md`; surgió al resolver D5 |
| D11 | Tokens sin revocación y guardados en `sessionStorage` | Medio (seguridad): un token robado vale hasta 8 h; sin cookie `HttpOnly` | Abierta | (a registrar) | Ver `docs/security.md`; surgió al resolver D5 |

## Detalle de las deudas resueltas

### D1 - NodeTool@0 deprecado (AB#361)
- **Hallazgo:** el log de la run #5 advirtió que `NodeTool@0` está deprecado y recomendó `UseNode@1`.
- **Decisión:** migrar en una rama `refactor/361-usenode` con su propio PR.
- **Cambio:** `azure-pipelines.yml` usa `UseNode@1` con `version: 22.x`.
- **Verificación:** la corrida #25 sobre la rama terminó en verde y la lista de advertencias ya no contiene la de deprecación.

### D2 - Reglas de transición con una sola fuente de verdad (AB#362)
- **Hallazgo:** `TRANSICIONES` y los estados asignables existían en `backend/src/workflow.js` y en `frontend/src/constants.js`.
- **Decisión:** el backend es la fuente; el frontend consume las reglas y no conserva copia. Rama `refactor/362-workflow-fuente-unica`, PR #16.
- **Cambio:** nuevo `GET /api/workflow`; `IncidentList` carga las reglas y las pasa a `IncidentDetail`; sin reglas cargadas no se ofrecen acciones.
- **Verificación:** 3 pruebas nuevas en el backend y 2 en el frontend; una de ellas demuestra que la interfaz sigue las transiciones recibidas y no una copia.

### D5 - Autenticación y control de acceso por rol (AB#365, Feature AB#375)
- **Hallazgo:** el selector provisional "Actuando como" permitía actuar como cualquier usuario y el cliente enviaba `autor_id` y `solicitante_id`.
- **Decisión:** autenticación propia sin dependencias nuevas (scrypt + token HS256), tres roles, visibilidad y permisos aplicados **en el backend** y asignación automática por categoría.
- **Cambio:** migración `002_auth.sql`, `auth.js`, `middleware/auth.js`, `access.js`, `assignment.js`, rutas protegidas, pantalla de login y UI adaptada al rol.
- **Verificación:** backend 108 pruebas (matriz de permisos por rol, 404/403, asignación automática, tokens) y frontend 67 pruebas (login, sesión, expiración, permisos).
- **Deuda derivada:** D10 y D11 (límite de intentos y revocación de tokens).

## Deudas abiertas: por qué no se resolvieron ahora

- **D3 y D4 van juntas.** Resolver D3 correctamente exige una transacción, y D4 impide probarla con pg-mem. La salida es ejecutar las pruebas contra PostgreSQL real (servicio en el pipeline o contenedor) y luego envolver las escrituras en una transacción.
- **D10 y D11** son las siguientes mejoras de seguridad naturales tras el login: límite de intentos, y cookie `HttpOnly` con revocación.
- **D6, D7, D8, D9** son mejoras acotadas que pueden abordarse en versiones posteriores.
