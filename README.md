# IT Incident Hub

Plataforma web para registrar, asignar y dar seguimiento a incidentes de TI, construida como proyecto integrador DevOps.
Objetivo principal: demostrar un flujo verificable **Azure Boards -> rama -> commit (AB#ID) -> PR -> CI -> artefacto -> release**.

## Stack
| Capa | Tecnología |
|---|---|
| Frontend | React |
| Backend | Node.js + Express (API REST) |
| Datos | PostgreSQL |
| CI/CD | Azure Pipelines (principal) + GitHub Actions (complementario) |

## Estructura
```
backend/    API REST
frontend/   SPA React
database/   migraciones y semillas
tests/      pruebas
devops/     scripts, agente autohospedado, ambientes
docs/       arquitectura, branching, deuda técnica, seguridad, dependencias, release
.github/workflows/   GitHub Actions
azure-pipelines.yml  pipeline principal
```

## Requisitos
Node.js 20+, Docker Desktop, Git. (Se completará con las instrucciones de instalación y ejecución al cerrar la semana 1.)

## Repositorios
- GitHub: https://github.com/SotoJ08/incident-hub
- Azure DevOps: https://dev.azure.com/jsoto1/incident-hub

## Equipo (proyecto individual con roles simulados)
| Rol | Responsable |
|---|---|
| Backend / DevOps | Jesus Soto (SotoJ08) |
| Frontend | Jesus Soto - rol Frontend |
| QA / Seguridad | Jesus Soto - rol QA |

Proyecto individual: los roles se separan con identidades de commit distintas, todas bajo la misma cuenta verificada.

## Documentación
Ver [docs/](docs/): [arquitectura](docs/architecture.md), [branching](docs/branching.md), [deuda técnica](docs/technical-debt.md), [seguridad](docs/security.md), [dependencias](docs/dependencies.md), [estrategia de release](docs/release-strategy.md), [backlog](docs/backlog.md).
