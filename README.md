# IT Incident Hub

Plataforma web para registrar, asignar y dar seguimiento a incidentes de TI, construida como **proyecto integrador DevOps**.
El objetivo principal es demostrar un flujo verificable:

**Azure Boards -> rama -> commit (`AB#ID`) -> Pull Request -> CI -> artefacto -> versión -> release por ambientes**

Versión actual: **1.0.0** (primera versión estable). Historial de versiones en [CHANGELOG.md](CHANGELOG.md).

## Qué hace
| Área | Funcionalidad |
|---|---|
| Incidentes | Crear y consultar: título, descripción, categoría, prioridad, solicitante, fecha y estado |
| Operación | Asignar técnico y cambiar estado: `NUEVO -> ASIGNADO -> EN_PROCESO -> RESUELTO -> CERRADO` |
| Seguimiento | Comentarios y bitácora automática por incidente |
| Consulta | Filtros por estado, prioridad, categoría y técnico |
| Indicadores | Dashboard: abiertos, cerrados, críticos y distribución por estado, categoría y técnico |
| Integración | API REST + PostgreSQL |

## Stack
| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js 22 + Express (API REST) |
| Datos | PostgreSQL 16 |
| Pruebas | `node --test` + supertest + pg-mem (backend), Vitest + Testing Library (frontend) |
| CI/CD | Azure Pipelines (principal, agente autohospedado) + GitHub Actions (complementario) |

## Estructura
```
backend/              API REST (src/routes, src/workflow.js, src/migrate.js)
frontend/             SPA React (src/components)
database/             migraciones SQL y datos de desarrollo
tests/                pruebas de utilidades DevOps (escáner de secretos, despliegue, versiones)
devops/               scripts de despliegue y secretos, plantilla de pasos, guía del agente
docs/                 arquitectura, branching, deuda técnica, seguridad, dependencias, release, backlog
.github/workflows/    GitHub Actions
azure-pipelines.yml   pipeline principal (CI + despliegue a dev, staging y prod)
CHANGELOG.md          versiones SemVer
```

## Requisitos
- **Node.js 22** (o 20.19+) y npm
- **Git**
- **Docker Desktop** (solo para la base de datos PostgreSQL local)

## Instalación y ejecución (PowerShell)

### 1. Clonar e instalar
```powershell
git clone https://github.com/SotoJ08/incident-hub.git
cd incident-hub
cd backend;  npm ci; cd ..
cd frontend; npm ci; cd ..
```

### 2. Base de datos
Elija una contraseña **local** (no la reutilice de otra cuenta; no se guarda en el repositorio):
```powershell
$env:DB_PASSWORD = "<su-contraseña-local>"
docker compose up -d db
```
Aplicar migraciones y datos de desarrollo:
```powershell
$env:DATABASE_URL = "postgres://incident:$($env:DB_PASSWORD)@localhost:5432/incident_hub"
cd backend; npm run migrate; cd ..
Get-Content database/seed.sql | docker compose exec -T db psql -U incident -d incident_hub
```

### 3. API (puerto 3000)
```powershell
cd backend
npm start
```
Comprobación: `http://localhost:3000/health` responde `{"status":"ok"}`.

### 4. Frontend (puerto 5173)
En otra terminal:
```powershell
cd frontend
npm run dev
```
Abra `http://localhost:5173`. Vite reenvía `/api` al backend (puerto 3000).

> **Uso:** como aún no hay autenticación, elija quién actúa en el selector **"Actuando como"** (p. ej. un ADMIN) antes de crear incidentes, asignar, cambiar estado o comentar.

## Pruebas
```powershell
cd backend;  npm test            # API y base de datos simulada (pg-mem)
cd frontend; npm test            # interfaz (Vitest)
node --test "tests/*.test.js"    # utilidades DevOps: secretos, despliegue y versiones
node devops/scripts/check-secrets.js   # escáner de secretos
```
Las mismas pruebas, más `npm audit`, se ejecutan en Azure Pipelines y en GitHub Actions.

## API (resumen)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| POST / GET | `/api/incidents` | Crear / listar (filtros `estado`, `prioridad`, `category_id`, `tecnico_id`) |
| GET | `/api/incidents/:id` | Detalle |
| PATCH | `/api/incidents/:id/assign` | Asignar o reasignar técnico |
| PATCH | `/api/incidents/:id/status` | Cambiar estado (valida transiciones) |
| GET / POST | `/api/incidents/:id/events` · `/comments` | Historial y comentarios |
| GET | `/api/stats` | Indicadores del dashboard |
| GET | `/api/categories` · `/api/users?rol=` · `/api/workflow` | Catálogos y reglas del flujo |

Detalle en [docs/architecture.md](docs/architecture.md).

## Proceso DevOps
- **Backlog:** Azure Boards, 2 Epics, 4 Features, User Stories y Tasks, más Bug y deuda técnica; ver [docs/backlog.md](docs/backlog.md).
- **Ramas:** `main` estable; trabajo en `feature/*`, `fix/*`, `refactor/*`; ver [docs/branching.md](docs/branching.md).
- **CI:** [azure-pipelines.yml](azure-pipelines.yml) (checkout, Node, escáner de secretos, build, pruebas, `npm audit`, empaquetado, artefacto) y [.github/workflows/ci.yml](.github/workflows/ci.yml).
- **Agente autohospedado:** [devops/README.md](devops/README.md).
- **Seguridad y dependencias:** [docs/security.md](docs/security.md), [docs/dependencies.md](docs/dependencies.md).
- **Release:** [docs/release-strategy.md](docs/release-strategy.md): dev (automático), staging y prod con aprobación, rollback.
- **Deuda técnica:** [docs/technical-debt.md](docs/technical-debt.md).

## Repositorios
- GitHub: https://github.com/SotoJ08/incident-hub
- Azure DevOps: https://dev.azure.com/jsoto1/incident-hub (Boards, Repos, Pipelines, Environments)

## Equipo (proyecto individual con roles simulados)
| Rol | Responsable | Autor de commit |
|---|---|---|
| Backend | Jesus Soto (SotoJ08) | `Jesus Soto (Backend)` |
| Frontend | Jesus Soto (SotoJ08) | `Jesus Soto (Frontend)` |
| DevOps | Jesus Soto (SotoJ08) | `Jesus Soto (DevOps)` |
| QA / Seguridad | Jesus Soto (SotoJ08) | `Jesus Soto (QA)` |

Es un proyecto individual: los roles se distinguen por el nombre del autor en cada commit, todos bajo la misma cuenta y correo verificados.

## Limitaciones conocidas
- **Sin autenticación:** el selector "Actuando como" es provisional (deuda D5).
- **Pruebas con pg-mem**, no con PostgreSQL real (deuda D4): las instrucciones de ejecución con Docker están pendientes de verificarse de punta a punta contra PostgreSQL real.
- **El despliegue por ambientes es local:** carpetas versionadas en el agente, no un servidor externo.
- Lista completa y estado en [docs/technical-debt.md](docs/technical-debt.md).
