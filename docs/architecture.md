# Arquitectura

## Visión general
```
Usuario -> Frontend (React + Vite, :5173) -> API REST (Node/Express, :3000) -> PostgreSQL (:5432)
              |  proxy /api                        |  pg Pool
              +------------------------------------+
   Authorization: Bearer <token>  (todas las rutas salvo login, /api/workflow y /health)
```
El stack sigue la arquitectura de referencia del enunciado. El proceso DevOps (CI, artefacto, ambientes) se describe más abajo.

## Backend (`backend/src`)
| Archivo | Responsabilidad |
|---|---|
| `app.js` | `createApp(db, { authSecret })`: monta rutas públicas, el middleware de sesión y las rutas protegidas; recibe cualquier objeto con `query()` (Pool en producción, pg-mem en pruebas) |
| `server.js` | Arranque: lee `DATABASE_URL`, `PORT` y `AUTH_SECRET` (obligatoria con `NODE_ENV=production`) |
| `migrate.js` | Aplica en orden `database/migrations/*.sql` y registra cada una en `schema_migrations` (idempotente) |
| `auth.js` | Hash de contraseñas con **scrypt** y tokens **HS256** firmados con HMAC (sin dependencias nuevas) |
| `middleware/auth.js` | `requireAuth`: valida el token y carga al usuario (rol y categorías) **desde la base en cada petición** |
| `access.js` | Reglas de acceso por rol (funciones puras): `scopeFor`, `canSee`, `canOperate`, `canAssign` |
| `assignment.js` | Asignación automática: técnico de la categoría con menos incidentes abiertos |
| `workflow.js` | **Fuente única** del ciclo de vida: transiciones y estados asignables |
| `routes/auth.js` | `POST /api/auth/login` y `GET /api/auth/me` |
| `routes/incidents.js` | Crear (con asignación automática), listar con filtros y detalle, limitados por rol |
| `routes/incident-actions.js` | Asignar técnico (administrador) y cambiar estado (administrador o técnico asignado); registran la bitácora |
| `routes/incident-history.js` | Historial y comentarios |
| `routes/stats.js` | Indicadores del dashboard, limitados por rol |
| `routes/catalogs.js`, `routes/workflow-route.js` | Categorías, usuarios (técnicos con sus categorías) y reglas del flujo |

### Ciclo de vida del incidente
```
NUEVO -> ASIGNADO -> EN_PROCESO -> RESUELTO -> CERRADO
                        ^             |
                        +-- reabrir --+
```
- Al crear un incidente, si la categoría tiene técnico, se asigna solo y pasa a `ASIGNADO` (queda en la bitácora). Si no, queda `NUEVO` para que un administrador lo asigne.
- Un administrador puede reasignar en `NUEVO`, `ASIGNADO` y `EN_PROCESO`, solo a técnicos que atiendan la categoría; no en `RESUELTO` ni `CERRADO`. `CERRADO` es terminal y no admite comentarios.
- Para avanzar de estado el incidente debe tener técnico. Una transición inválida responde `409` con los estados permitidos.

### Autenticación y autorización
- **Sesión:** token HS256 de 8 horas; el rol y las categorías se leen de la base en cada petición (un cambio de permisos aplica al instante).
- **Quién actúa lo decide el token**: el autor de la bitácora, de un comentario y el solicitante de un incidente no se aceptan en el cuerpo.
- **Visibilidad** (`access.scopeFor`): administrador, todo; técnico, las categorías que atiende; solicitante, lo que reportó. Fuera de alcance → `404`; visible pero sin permiso de operar → `403`.
- Detalle y límites conocidos: [security.md](security.md).

### API REST
| Método | Ruta | Códigos | Notas |
|---|---|---|---|
| GET | `/health` | 200 | Público |
| POST | `/api/auth/login` | 200, 400, 401 | `email`, `password`; devuelve `{ token, user }` |
| GET | `/api/auth/me` | 200, 401 | Usuario de la sesión (rol y categorías) |
| POST | `/api/incidents` | 201, 400, 401 | `titulo`, `descripcion`, `category_id`, `prioridad` opcional (BAJA); el solicitante es el usuario de la sesión; se asigna solo si la categoría tiene técnico |
| GET | `/api/incidents` | 200, 400, 401 | Filtros combinables con AND: `estado`, `prioridad`, `category_id`, `tecnico_id`; más recientes primero; **limitado por rol** |
| GET | `/api/incidents/:id` | 200, 400, 401, 404 | |
| PATCH | `/api/incidents/:id/assign` | 200, 400, 401, 403, 404, 409 | Solo administrador; `tecnico_id` (rol TECNICO que atienda la categoría) |
| PATCH | `/api/incidents/:id/status` | 200, 400, 401, 403, 404, 409 | Administrador o técnico asignado; `estado` |
| GET | `/api/incidents/:id/events` | 200, 400, 401, 404 | Cronológico; `?tipo=COMENTARIO\|CAMBIO_ESTADO\|ASIGNACION` |
| POST | `/api/incidents/:id/comments` | 201, 400, 401, 404, 409 | `comentario` (máx. 2000) |
| GET | `/api/stats` | 200, 401 | `total`, `abiertos`, `cerrados`, `criticos`, `sin_asignar`, `por_estado`, `por_categoria`, `por_tecnico`; limitado por rol |
| GET | `/api/categories` · `/api/users?rol=` | 200, 401 | Catálogos (los técnicos incluyen `categorias`; sin correos ni hashes) |
| GET | `/api/workflow` | 200 | Público: reglas del flujo |

Los errores devuelven `{ "errors": [ ... ] }`. Definiciones: **abiertos** = no `CERRADO`; **críticos** = prioridad `CRITICA` aún no `CERRADO`.

## Modelo de datos (`database/migrations/001_init.sql` y `002_auth.sql`)
```
users(id, nombre, email UNIQUE, rol {SOLICITANTE|TECNICO|ADMIN}, password_hash, created_at)
categories(id, nombre, parent_id -> categories)
tecnico_categorias(user_id -> users, category_id -> categories)   PK (user_id, category_id)
incidents(id, titulo, descripcion, category_id -> categories, prioridad {BAJA..CRITICA},
          estado {NUEVO..CERRADO}, solicitante_id -> users, tecnico_id -> users, created_at, updated_at)
incident_events(id, incident_id -> incidents, autor_id -> users, tipo {COMENTARIO|CAMBIO_ESTADO|ASIGNACION}, detalle, created_at)
schema_migrations(name, applied_at)
```
Los catálogos de estado, prioridad, rol y tipo de evento se imponen con `CHECK`; hay índices por estado, prioridad, técnico, categoría de técnico y por incidente en la bitácora.

## Frontend (`frontend/src`)
| Componente | Función |
|---|---|
| `App` | Sesión: login, validación del token guardado, navegación Incidentes / Dashboard, usuario y cierre de sesión |
| `Login` | Pantalla de inicio de sesión |
| `session.js` · `api.js` | Token en `sessionStorage`; todas las llamadas HTTP con `Authorization`; vuelta al login si el backend responde 401 |
| `permissions.js` | Qué botones y textos mostrar según el rol (el backend es quien autoriza) |
| `IncidentList` + `Filters` | Lista y filtros; carga catálogos y reglas del flujo; texto del alcance según el rol |
| `IncidentForm` | Alta de incidentes con aviso de asignación automática |
| `IncidentDetail` | Asignación (administrador, solo técnicos que atienden la categoría) y cambio de estado (administrador o técnico asignado) |
| `IncidentHistory` | Bitácora y comentarios |
| `Dashboard` | Tarjetas e indicadores en barras CSS accesibles (sin librerías de gráficos) |

Vite reenvía `/api` al backend en desarrollo.

## Arquitectura DevOps
```
Work Item (Azure Boards) -> rama feature/* -> commit "AB#ID" -> Pull Request (Azure Repos)
   -> Azure Pipelines (agente autohospedado): escáner de secretos, build, pruebas, npm audit, empaquetado
   -> artefacto "incident-hub" (ZIP backend + ZIP frontend)
   -> [solo main] dev (auto) -> staging (aprobación) -> prod (aprobación)
GitHub Actions (complementario): mismas pruebas, audit y escáner en cada PR y push a main
```
- **Un solo repositorio** con espejo: Azure Repos (flujo de PR y pipelines) y GitHub (Actions). Las fusiones a `main` usan *merge commit* para conservar la autoría de cada integrante.
- **Equipo de 3 cuentas** (SotoJ08, DharaGar29, Edd210): cada commit se enlaza a su cuenta en GitHub.
- **Secretos:** variable group protegido y GitHub Secrets; nunca en el repositorio ([security.md](security.md)).
- **Despliegue:** carpetas versionadas por ambiente con `current.json` y rollback ([release-strategy.md](release-strategy.md)).

## Estrategia de pruebas
| Nivel | Herramienta | Qué cubre |
|---|---|---|
| API y reglas | `node --test` + supertest + pg-mem | Rutas, validaciones, transiciones, bitácora, indicadores, **tokens, login, matriz de permisos por rol y asignación automática** |
| Interfaz | Vitest + Testing Library | Componentes, filtros, formularios, **login, sesión y expiración, permisos por rol**, errores |
| DevOps | `node --test` | Escáner de secretos, despliegue y rollback, coherencia de versiones |
| Integración continua | Azure Pipelines y GitHub Actions | Todo lo anterior más `npm audit` |

**Límite conocido (D4):** pg-mem no reproduce todo PostgreSQL (por ejemplo, `ROLLBACK` no revierte), por lo que no se prueban transacciones; ver [technical-debt.md](technical-debt.md).

## Decisiones de diseño
| Decisión | Motivo |
|---|---|
| Reglas del flujo en `workflow.js` y expuestas por `GET /api/workflow` | Una sola fuente de verdad (D2) |
| `createApp(db)` con la base de datos inyectada | Probar la API sin servidor de base de datos real |
| Barras CSS en lugar de una librería de gráficos | Sin dependencias nuevas ni vulnerabilidades extra |
| Autenticación propia con `crypto` de Node (scrypt + HS256) | Sin dependencias nuevas; reduce superficie de ataque y de `npm audit` |
| Permisos aplicados en el backend; la interfaz solo oculta botones | La seguridad no puede depender del cliente |
| Fuera de alcance → 404, sin permiso → 403 | No revelar la existencia de incidentes ajenos |
| Rama de integración `feature/login-roles` | Tres piezas interdependientes sin dejar `main` a medias |
| Merge commit en lugar de squash para `main` | Conservar la autoría de cada integrante en el historial |
| Un artefacto único promovido entre ambientes | Se prueba una vez y se despliega lo mismo |
