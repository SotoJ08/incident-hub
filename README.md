# IT Incident Hub

Plataforma web para registrar, asignar y dar seguimiento a incidentes de TI, construida como **proyecto integrador DevOps**.
El objetivo principal es demostrar un flujo verificable:

**Azure Boards -> rama -> commit (`AB#ID`) -> Pull Request -> CI -> artefacto -> versión -> release por ambientes**

Versión actual: **1.1.0** (inicio de sesión con roles y asignación automática). La `v1.0.0` fue la primera versión estable. Historial en [CHANGELOG.md](CHANGELOG.md).

## Qué hace
| Área | Funcionalidad |
|---|---|
| Incidentes | Crear y consultar: título, descripción, categoría, prioridad, solicitante, fecha y estado |
| Operación | Asignar técnico (administrador) y cambiar estado (administrador o técnico asignado): `NUEVO -> ASIGNADO -> EN_PROCESO -> RESUELTO -> CERRADO` |
| Seguimiento | Comentarios y bitácora automática por incidente |
| Consulta | Filtros por estado, prioridad, categoría y técnico |
| Indicadores | Dashboard: abiertos, cerrados, críticos y distribución por estado, categoría y técnico |
| Acceso | **Inicio de sesión** con 3 roles: solicitante (ve lo suyo), técnico (ve y atiende las categorías de su especialidad) y administrador (todo) |
| Asignación | **Automática por categoría**: el incidente va al técnico de esa categoría con menos carga (p. ej. el de telecomunicaciones solo ve temas de telecomunicaciones) |
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

### Usuarios de demostración
Al aplicar `database/seed.sql` existen estos usuarios. Todos comparten la misma **contraseña de prueba**: `IncidentHub#2026` (en el repositorio solo está su hash; no usar este seed en un ambiente real).

| Correo | Rol | Qué ve y qué hace |
|---|---|---|
| `ana@example.com`, `pedro@example.com` | Solicitante | Crea incidentes y ve solo los suyos; puede comentar |
| `luis@example.com` | Técnico | Atiende **Equipo de cómputo** |
| `marta@example.com` | Técnico | Atiende **Sistema Institucional** y **Gestión de Accesos** |
| `carlos@example.com` | Técnico | Atiende **Telecomunicaciones** (solo ve temas de telecomunicaciones) |
| `admin@example.com` | Administrador | Ve todo, asigna y reasigna técnicos, cambia cualquier estado |

La categoría **Otros** no tiene técnico: sus incidentes quedan `NUEVO` hasta que un administrador los asigne.

> **Uso:** abra `http://localhost:5173`, inicie sesión con uno de los correos de arriba y pruebe: como `ana@example.com` cree un incidente de **Telecomunicaciones** → queda asignado solo a Carlos, que lo ve en su lista; Luis y Marta no. Luego, como `carlos@example.com`, cambie su estado y comente.
>
> En desarrollo la API firma las sesiones con un secreto aleatorio por proceso (se pierden al reiniciar). Para fijarlo defina `AUTH_SECRET`; con `NODE_ENV=production` es **obligatoria**.

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
| POST / GET | `/api/auth/login` · `/api/auth/me` | Iniciar sesión (devuelve token) / usuario de la sesión. **Todas las demás rutas exigen `Authorization: Bearer <token>`** |
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
- **Documentación profesional completa** (análisis, diseño, API, seguridad, DevOps, pruebas, manuales y trazabilidad, con diagramas): [Word](docs/IT-Incident-Hub-Documentacion.docx) · [PDF](docs/IT-Incident-Hub-Documentacion.pdf).

## Repositorios
- GitHub: https://github.com/SotoJ08/incident-hub
- Azure DevOps: https://dev.azure.com/jsoto1/incident-hub (Boards, Repos, Pipelines, Environments)

## Equipo (proyecto individual con 3 integrantes simulados)
Es un proyecto individual. El trabajo se reparte entre **tres integrantes simulados**, cada uno con su **propia cuenta de GitHub y su propio correo**, de modo que sus contribuciones se pueden verificar en el historial de commits y en el gráfico de contribuidores del repositorio (regla 9 del enunciado).

| Integrante | Cuenta de GitHub | Rol | Responsabilidades |
|---|---|---|---|
| 1 | [SotoJ08](https://github.com/SotoJ08) | Backend y DevOps | API, base de datos, pipelines, ambientes, versionado y release |
| 2 | [DharaGar29](https://github.com/DharaGar29) | Frontend | Interfaz React, accesibilidad y pruebas de interfaz |
| 3 | [Edd210](https://github.com/Edd210) | QA y Seguridad | Pruebas, escáner de secretos, dependencias, deuda técnica y documentación |

**Transparencia sobre el historial.** Entre el 17 y el 20 de octubre de 2026 (hasta la versión 0.9.1) todos los commits se hicieron desde una sola cuenta, con el rol escrito en el nombre del autor: `Jesus Soto (Backend)` y `Jesus Soto (DevOps)` corresponden al integrante 1, `Jesus Soto (Frontend)` al integrante 2 y `Jesus Soto (QA)` al integrante 3. Las cuentas de los integrantes 2 y 3 se crearon el 24 de octubre de 2026; **desde esa fecha el trabajo nuevo se firma con la cuenta de cada integrante**. El historial anterior no se reescribió.

## Limitaciones conocidas
- **Autenticación básica:** sin límite de intentos de login ni revocación de tokens, y el token vive en `sessionStorage` (deudas D10 y D11; ver [docs/security.md](docs/security.md)).
- **Pruebas con pg-mem**, no con PostgreSQL real (deuda D4): las instrucciones de ejecución con Docker están pendientes de verificarse de punta a punta contra PostgreSQL real.
- **El despliegue por ambientes es local:** carpetas versionadas en el agente, no un servidor externo.
- Lista completa y estado en [docs/technical-debt.md](docs/technical-debt.md).
