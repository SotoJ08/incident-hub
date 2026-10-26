# Entrega: IT Incident Hub - cumplimiento del enunciado

Documento de entrega del **Proyecto integrador DevOps "IT Incident Hub"**. Contrasta, punto por punto, cada requisito del PDF con su evidencia verificable en el repositorio y en Azure DevOps.

| Dato | Valor |
|---|---|
| Versión entregada | **v1.1.0** (tag anotado y release en GitHub); primera versión estable `v1.0.0` |
| Repositorio (GitHub) | https://github.com/SotoJ08/incident-hub |
| Proyecto Azure DevOps | https://dev.azure.com/jsoto1/incident-hub (Boards, Repos, Pipelines, Environments) |
| Repositorios | **Uno solo** con hitos por versión (indicado por el docente en lugar de 3 repositorios semanales) |
| Equipo | 3 integrantes simulados con cuentas distintas: SotoJ08, DharaGar29 y Edd210 |
| Pruebas | Backend 108 · Frontend 67 · Utilidades DevOps 27 (202 en total), todas en verde |

> **Cómo verificar sin confiar en capturas:** el historial de Git (`docs/evidencia/historial-git.csv`), los exportes del tablero, de los PR y del pipeline (`docs/evidencia/`) y las URLs de arriba permiten reconstruir el trabajo. Los exportes se generaron desde las APIs de Azure DevOps y de GitHub el 25 de octubre de 2026; se pueden regenerar (ver `docs/evidencia/README.md`).

## 1. Resultado esperado: flujo de punta a punta
`Azure Boards -> Código -> Pull Request -> CI -> Calidad -> Artefacto -> Versión -> Release`

| Paso | Evidencia |
|---|---|
| Work Item | Tablero en Azure Boards: `docs/evidencia/backlog-azure-boards.csv` |
| Rama + commit con `AB#ID` | `docs/evidencia/historial-git.csv` (todos los commits citan su Work Item) |
| Pull Request | `docs/evidencia/pull-requests.csv` (30 PR, cada uno con su Work Item vinculado) |
| CI y calidad | `docs/evidencia/pipeline-runs.csv`, `azure-pipelines.yml`, `.github/workflows/ci.yml` |
| Artefacto | Artefacto `incident-hub` (ZIP backend + ZIP frontend) publicado en cada corrida |
| Versión | `CHANGELOG.md`, `docs/evidencia/tags.txt` (13 tags `v0.1.0` a `v1.1.0`) |
| Release | `docs/release-strategy.md`; release de GitHub `v1.0.0` y `v1.1.0` |

## 2. Alcance funcional
| Área | Mínimo requerido | Cumplido | Dónde verlo |
|---|---|---|---|
| Incidentes | Crear y consultar: título, descripción, categoría, prioridad, usuario, fecha y estado | Sí | `POST/GET /api/incidents`, formulario y lista en el frontend |
| Operación | Asignar técnico y cambiar estado (NUEVO, ASIGNADO, EN_PROCESO, RESUELTO, CERRADO) | Sí | `PATCH .../assign` y `.../status`; reglas en `backend/src/workflow.js` |
| Seguimiento | Comentarios o bitácora; historial visible por incidente | Sí | `GET .../events`, `POST .../comments`; panel de historial |
| Consulta | Filtros por estado, prioridad, categoría y técnico | Sí | `GET /api/incidents?estado=&prioridad=&category_id=&tecnico_id=` |
| Indicadores | Dashboard: abiertos, cerrados, críticos y distribución por categoría y técnico | Sí | `GET /api/stats` y vista Dashboard |
| Integración | API REST + persistencia | Sí | Express + PostgreSQL (`database/migrations`) |
| **Adicional** | (no pedido) Inicio de sesión con roles y asignación automática por categoría | Sí (v1.1.0) | `docs/security.md`, Feature AB#375 |

## 3. Arquitectura de referencia
Frontend React → API REST Node/Express → PostgreSQL, tal como el enunciado. Detalle en [architecture.md](architecture.md).

## 4. Condiciones DevOps obligatorias

| # | Condición del PDF | Estado | Evidencia |
|---|---|---|---|
| 1 | **Azure Boards**: mínimo 2 Epics, 4 Features, 8 User Stories y 16 Tasks, con responsables, prioridad, estimación y estados | **Cumple** (62 elementos: 2 Epics, 5 Features, 12 User Stories, 40 Tasks y 3 Bugs) | `docs/evidencia/backlog-azure-boards.csv`. Estados: Closed (lo terminado), Active (historia de deuda técnica) y New (6 deudas abiertas). Responsable único en Azure (proyecto individual); el rol de cada tarea va en las etiquetas (Backend, Frontend, DevOps, QA) |
| 2 | **Git**: `main` estable; trabajo en `feature/*`, `fix/*` o `refactor/*` | **Cumple** | [branching.md](branching.md). Se usaron además `docs/*` y `release/*` para documentación y releases |
| 3 | **Trazabilidad**: cambios vinculados con Work Items (`AB#ID`) | **Cumple** | Todos los commits y títulos de PR citan `AB#ID`; los PR llevan el Work Item vinculado |
| 4 | **Pull Requests**: mínimo 6 reales, con descripción, revisión y evidencia de validación | **Cumple** (30) | `docs/evidencia/pull-requests.csv`. Cada PR tiene descripción, Work Item vinculado, voto de aprobación y un comentario con la corrida del pipeline. **Limitación:** la aprobación la da la misma identidad de Azure DevOps (proyecto individual); no hay revisor independiente |
| 5 | **Deuda técnica**: ≥5 identificadas, ≥2 resueltas con trabajo trazable | **Cumple** (11 identificadas, 3 resueltas: D1, D2, D5) | [technical-debt.md](technical-debt.md), AB#360 a AB#369 |
| 6 | **Azure Pipelines**: checkout, instalación, build, pruebas, revisión de dependencias/seguridad, empaquetado y publicación | **Cumple** | `azure-pipelines.yml`: checkout, UseNode, escáner de secretos, `npm ci`, build, pruebas con JUnit, `npm audit`, ZIP y artefacto, más despliegue a ambientes |
| 7 | **Fallo controlado**: pipeline fallido, diagnóstico, corrección y ejecución exitosa | **Cumple** (5 casos reales) | [ci-failure-diagnosis.md](ci-failure-diagnosis.md): #6→#7, #34→#36/#37, #39→#40, #48→#50 y #38 |
| 8 | **Agente autohospedado** | **Cumple** | Agente `agente-local-01` en el pool `Default`; todas las corridas se ejecutan en él ([devops/README.md](../devops/README.md)) |
| 9 | **Secretos**: nunca en el repositorio | **Cumple** | Variable group protegido, GitHub Secret, escáner de secretos en ambos CI ([security.md](security.md)) |
| 10 | **GitHub Actions**: workflow complementario | **Cumple** | `.github/workflows/ci.yml` (PR y push: pruebas, build, `npm audit`, escáner de secretos, referencia a Work Item); `docs/evidencia/github-actions-runs.csv`. **Ejecución disparada por un Pull Request de GitHub:** PR #1 de GitHub (rama `docs/390-entrega`), run `40265516362`, evento `pull_request`, resultado `success` |
| 11 | **Dependencias**: analizar, documentar vulnerabilidades, severidad y decisión | **Cumple** | [dependencies.md](dependencies.md): vite/vitest (high y critical, solo desarrollo) y body-parser (high, producción) |
| 12 | **Versionado**: SemVer con secuencia coherente hasta v1.0.0 | **Cumple** | 13 tags anotados `v0.1.0` → `v1.1.0` y `CHANGELOG.md`; la prueba `tests/versions.test.js` impide versiones incoherentes |
| 13 | **Lanzamiento**: estrategia con ambientes y controles de aprobación/validación | **Cumple** | [release-strategy.md](release-strategy.md). Ambientes `dev`, `staging` y `prod` con check de aprobación; **dev se despliega solo y se valida**. La aprobación de staging y prod es manual; la corrida final fue aprobada y desplegada (ver «Estado de los ambientes») |

### Estado de los ambientes
- **dev:** desplegado automáticamente por cada corrida de `main` (releases `0.9.1-b37` y posteriores en `_work/deploy/dev` del agente), con validación posterior y rollback probado.
- **staging y prod:** el pipeline se **detiene a esperar la aprobación humana**, que es el control diseñado. Las corridas de `main` quedan en espera hasta que la persona responsable las aprueba en Azure DevOps (Pipelines → corrida → *Review*). **La corrida final de `main` (20261026.5, que incluye la entrega v1.1.0) fue aprobada por el responsable del proyecto (25 oct 2026) y completó dev → staging → prod en verde.** Las corridas intermedias anteriores de `main` se dejaron sin aprobar a propósito, para no desplegar versiones viejas sobre la actual.
- El despliegue es **local** (carpetas versionadas por ambiente en el agente), no un servidor externo: está dicho en el README y en `release-strategy.md`.

## 5. Organización del repositorio
Estructura del enunciado respetada: `backend/`, `frontend/`, `database/`, `tests/`, `devops/`, `docs/`, `.github/workflows/`, `azure-pipelines.yml` y `README.md`. Adicionales: `CHANGELOG.md`, `docker-compose.yml`, `.env.example`.

## 6. Plan de trabajo (3 semanas)
El enunciado prevé tres semanas; el desarrollo real se **comprimió en 9 días** (17 al 25 de octubre de 2026) por la fecha de entrega. Las tres fases se cubrieron en este orden, y los hitos `v0.1.0`, `v0.5.0` y `v1.0.0` equivalen a las tres entregas parciales:

| Fase | Foco | Hito | Evidencia clave |
|---|---|---|---|
| 1 | Planificación + desarrollo | `v0.1.0` | Work Item → rama → commit → PR (PR #1 a #3) |
| 2 | CI + calidad + seguridad | `v0.5.0` (funcionalidad completa) y siguientes | Pipeline fallido y luego exitoso (#6→#7), secretos, agente, GitHub Actions, deuda técnica |
| 3 | Estabilización + release | `v1.0.0` y `v1.1.0` | Release y demostración (README y `LOCAL-DEMO`) |

## 7. Flujo de entrega
`Task → feature/* → commit con AB#ID → PR → revisión → main → pipeline → artefacto → release`. Cada paso está en los exportes y en las URLs de Azure DevOps y GitHub.

## 8. Entregables
| Entregable | Dónde está |
|---|---|
| URL del proyecto Azure DevOps y del repositorio | Tabla inicial de este documento |
| Backlog y tablero actualizados | `docs/evidencia/backlog-azure-boards.csv` y Azure Boards |
| Código fuente funcional | `backend/`, `frontend/`, `database/` |
| `azure-pipelines.yml` y workflow de GitHub Actions | Raíz del repo y `.github/workflows/ci.yml` |
| Documentación en `docs/` | `architecture.md`, `branching.md`, `technical-debt.md`, `security.md`, `dependencies.md`, `release-strategy.md`, además de `backlog.md`, `ci-failure-diagnosis.md` y este documento |
| Evidencia de PR, code review, pipeline fallido/exitoso, agente, artefactos y versiones | `docs/evidencia/` |
| README con requisitos, instalación, ejecución y responsables | `README.md` |
| Demostración final operativa | `README.md` (ejecución con Docker) y la demostración sin Docker en `LOCAL-DEMO/` (ver `LEEME.txt`) |

## 9. Reglas
| Regla | Estado |
|---|---|
| Contribuciones verificables por integrante (usuarios propios por ser proyecto individual) | **Cumple con matices.** Tres cuentas distintas, cada commit enlazado a su cuenta en GitHub: en `main`, SotoJ08 32 commits, Edd210 11 y DharaGar29 3 (`docs/evidencia/contribuciones.txt`). **El reparto no es equilibrado** y el historial anterior al 24 de octubre se hizo desde una sola cuenta (con el rol en el nombre del autor); no se reescribió |
| No concentrar desarrollo y explicación en una sola persona | **Parcial**: ver el punto anterior; la explicación del proyecto la domina quien lo desarrolló |
| Secretos reales fuera de commits, capturas y documentación | **Cumple**: escáner automático, valores solo en variables protegidas; la única credencial documentada es la contraseña de **prueba** del seed |
| Errores resueltos con el mismo flujo del equipo | **Cumple**: cada fallo (runs #6, #34, #38, #39, #48) se resolvió con Bug/Task, rama, PR y pipeline |
| Defensa: modificación o explicación de cualquier integrante | Para la defensa se incluye `docs/architecture.md`, `docs/security.md` y `LOCAL-DEMO/` para ejecutar el sistema |

## Limitaciones conocidas (honestas)
- **Staging y prod:** aprobados solo para la corrida final 20261026.5; las corridas intermedias antiguas siguen en espera (ver arriba).
- **Revisión de PR:** la misma identidad de Azure aprueba y fusiona (proyecto individual).
- **Pruebas con pg-mem**, no con PostgreSQL real (deuda D4); las instrucciones de Docker no se han ejecutado de punta a punta contra PostgreSQL real.
- **Despliegue local**, no en un servidor externo.
- **Autenticación básica** sin límite de intentos ni revocación de tokens (D10, D11).
- Reparto de commits desigual entre las 3 cuentas.
