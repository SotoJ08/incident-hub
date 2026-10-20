# Arquitectura

## Visión general
```
Usuario -> Frontend (React + Vite, :5173) -> API REST (Node/Express, :3000) -> PostgreSQL (:5432)
              |  proxy /api                        |  pg Pool
              +------------------------------------+
```
El stack sigue la arquitectura de referencia del enunciado. El proceso DevOps (CI, artefacto, ambientes) se describe más abajo.

## Backend (`backend/src`)
| Archivo | Responsabilidad |
|---|---|
| `app.js` | `createApp(db)`: monta rutas, manejo de errores y 404; recibe cualquier objeto con `query()` (Pool en producción, pg-mem en pruebas) |
| `server.js` | Arranque: lee `DATABASE_URL` y `PORT` |
| `migrate.js` | Aplica en orden `database/migrations/*.sql` y registra cada una en `schema_migrations` (idempotente) |
| `workflow.js` | **Fuente única** del ciclo de vida: transiciones y estados asignables |
| `routes/incidents.js` | Crear, listar con filtros y detalle |
| `routes/incident-actions.js` | Asignar técnico y cambiar estado; registran el evento en la bitácora |
| `routes/incident-history.js` | Historial y comentarios |
| `routes/stats.js` | Indicadores del dashboard |
| `routes/catalogs.js`, `routes/workflow-route.js` | Categorías, usuarios y reglas del flujo para el frontend |

### Ciclo de vida del incidente
```
NUEVO -> ASIGNADO -> EN_PROCESO -> RESUELTO -> CERRADO
                        ^             |
                        +-- reabrir --+
```
- Asignar un incidente `NUEVO` lo pasa a `ASIGNADO`; en `ASIGNADO` y `EN_PROCESO` solo cambia el técnico (reasignación).
- No se puede asignar un incidente `RESUELTO` o `CERRADO`; `CERRADO` es terminal y no admite comentarios.
- Para avanzar de estado el incidente debe tener técnico. Una transición inválida responde `409` con los estados permitidos.

### API REST
| Método | Ruta | Códigos | Notas |
|---|---|---|---|
| GET | `/health` | 200 | |
| POST | `/api/incidents` | 201, 400 | `titulo`, `descripcion`, `category_id`, `solicitante_id`, `prioridad` opcional (BAJA) |
| GET | `/api/incidents` | 200, 400 | Filtros combinables con AND: `estado`, `prioridad`, `category_id`, `tecnico_id`; más recientes primero |
| GET | `/api/incidents/:id` | 200, 400, 404 | |
| PATCH | `/api/incidents/:id/assign` | 200, 400, 404, 409 | `tecnico_id` (rol TECNICO), `autor_id` |
| PATCH | `/api/incidents/:id/status` | 200, 400, 404, 409 | `estado`, `autor_id` |
| GET | `/api/incidents/:id/events` | 200, 400, 404 | Cronológico; `?tipo=COMENTARIO\|CAMBIO_ESTADO\|ASIGNACION` |
| POST | `/api/incidents/:id/comments` | 201, 400, 404, 409 | `comentario` (máx. 2000), `autor_id` |
| GET | `/api/stats` | 200 | `total`, `abiertos`, `cerrados`, `criticos`, `sin_asignar`, `por_estado`, `por_categoria`, `por_tecnico` |
| GET | `/api/categories` · `/api/users?rol=` · `/api/workflow` | 200 | Catálogos y reglas |

Los errores devuelven `{ "errors": [ ... ] }`. Definiciones: **abiertos** = no `CERRADO`; **críticos** = prioridad `CRITICA` aún no `CERRADO`.

## Modelo de datos (`database/migrations/001_init.sql`)
```
users(id, nombre, email UNIQUE, rol {SOLICITANTE|TECNICO|ADMIN}, created_at)
categories(id, nombre, parent_id -> categories)
incidents(id, titulo, descripcion, category_id -> categories, prioridad {BAJA..CRITICA},
          estado {NUEVO..CERRADO}, solicitante_id -> users, tecnico_id -> users, created_at, updated_at)
incident_events(id, incident_id -> incidents, autor_id -> users, tipo {COMENTARIO|CAMBIO_ESTADO|ASIGNACION}, detalle, created_at)
schema_migrations(name, applied_at)
```
Los catálogos de estado, prioridad, rol y tipo de evento se imponen con `CHECK`; hay índices por estado, prioridad, técnico y por incidente en la bitácora.

## Frontend (`frontend/src`)
| Componente | Función |
|---|---|
| `App` | Navegación Incidentes / Dashboard y selector "Actuando como" (provisional) |
| `IncidentList` + `Filters` | Lista y filtros; carga catálogos y reglas del flujo |
| `IncidentForm` | Alta de incidentes |
| `IncidentDetail` | Asignación y cambio de estado; ofrece solo las transiciones que informa el backend |
| `IncidentHistory` | Bitácora y comentarios |
| `Dashboard` | Tarjetas e indicadores en barras CSS accesibles (sin librerías de gráficos) |

`api.js` concentra las llamadas HTTP. Vite reenvía `/api` al backend en desarrollo.

## Arquitectura DevOps
```
Work Item (Azure Boards) -> rama feature/* -> commit "AB#ID" -> Pull Request (Azure Repos)
   -> Azure Pipelines (agente autohospedado): escáner de secretos, build, pruebas, npm audit, empaquetado
   -> artefacto "incident-hub" (ZIP backend + ZIP frontend)
   -> [solo main] dev (auto) -> staging (aprobación) -> prod (aprobación)
GitHub Actions (complementario): mismas pruebas, audit y escáner en cada PR y push a main
```
- **Un solo repositorio** con espejo: Azure Repos (flujo de PR y pipelines) y GitHub (Actions).
- **Secretos:** variable group protegido y GitHub Secrets; nunca en el repositorio ([security.md](security.md)).
- **Despliegue:** carpetas versionadas por ambiente con `current.json` y rollback ([release-strategy.md](release-strategy.md)).

## Estrategia de pruebas
| Nivel | Herramienta | Qué cubre |
|---|---|---|
| API y reglas | `node --test` + supertest + pg-mem | Rutas, validaciones, transiciones, bitácora, indicadores |
| Interfaz | Vitest + Testing Library | Componentes, filtros, formularios, errores, accesibilidad básica |
| DevOps | `node --test` | Escáner de secretos, despliegue y rollback, coherencia de versiones |
| Integración continua | Azure Pipelines y GitHub Actions | Todo lo anterior más `npm audit` |

**Límite conocido (D4):** pg-mem no reproduce todo PostgreSQL (por ejemplo, `ROLLBACK` no revierte), por lo que no se prueban transacciones; ver [technical-debt.md](technical-debt.md).

## Decisiones de diseño
| Decisión | Motivo |
|---|---|
| Reglas del flujo en `workflow.js` y expuestas por `GET /api/workflow` | Una sola fuente de verdad (D2) |
| `createApp(db)` con la base de datos inyectada | Probar la API sin servidor de base de datos real |
| Barras CSS en lugar de una librería de gráficos | Sin dependencias nuevas ni vulnerabilidades extra |
| Actor elegido en la interfaz (`autor_id`) | Provisional hasta tener autenticación (D5) |
| Un artefacto único promovido entre ambientes | Se prueba una vez y se despliega lo mismo |
