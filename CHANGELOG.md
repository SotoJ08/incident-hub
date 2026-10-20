# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).
Cada entrada indica los Work Items (`AB#ID`) y Pull Requests que la componen. Los tags `vX.Y.Z` apuntan al commit de `main` que cierra cada versión.

> **Nota de transparencia:** el desarrollo de las versiones 0.1.0 a 0.8.0 ocurrió entre el 17 y el 18 de octubre de 2026.
> Los tags de esas versiones se crearon el 20 de octubre de 2026 sobre los commits de `main` que cierran cada hito
> (la fecha del tag es la de su creación; la fecha de cada commit es la real).

## [Sin publicar]
- Pendiente para 1.0.0: README completo, documentación de arquitectura, validación final y aprobación a producción.

## [0.9.1] - 2026-10-20
### Corregido
- El despliegue fallaba en el agente autohospedado cuando la carpeta del artefacto conservaba ZIP de corridas anteriores («hay 2»): ahora se usa el ZIP exacto de la build actual (Bug AB#371, PR #22). Fallo real detectado por la run #34 de `main`.

## [0.9.0] - 2026-10-20 (candidata a 1.0.0)
### Añadido
- Versionado SemVer unificado: backend y frontend en la misma versión; `CHANGELOG.md` y prueba de coherencia de versiones (AB#356).

## [0.8.0] - 2026-10-18
### Añadido
- Despliegue por ambientes dev, staging y prod con aprobaciones, releases versionados, validación y rollback (AB#357, PR #19).

## [0.7.0] - 2026-10-18
### Añadido
- Escáner de secretos, verificador sin exponer valores, variable group protegido y GitHub Secrets (AB#355, PR #18).

## [0.6.0] - 2026-10-18
### Cambiado
- D1: `NodeTool@0` deprecado reemplazado por `UseNode@1` (AB#361, PR #15).
- D2: las reglas del flujo tienen una sola fuente de verdad, `GET /api/workflow` (AB#362, PR #16).
### Documentación
- Registro de 9 deudas técnicas reales (AB#360, PR #17).

## [0.5.0] - 2026-10-18
### Añadido
- Dashboard de indicadores (AB#350, AB#351), panel de asignación y estado (AB#347), historial con comentarios (AB#349) y formulario de alta (AB#359).
- Todas las áreas funcionales del enunciado cubiertas de punta a punta.

## [0.4.0] - 2026-10-17
### Añadido
- Asignación de técnico, transiciones de estado y bitácora por incidente (AB#346, AB#348, PR #8 y #9).

## [0.3.0] - 2026-10-17
### Añadido
- Frontend React con lista de incidentes y filtros (AB#345, PR #7).

## [0.2.1] - 2026-10-17
### Corregido
- El listado devuelve primero los incidentes más recientes (Bug AB#358, PR #6). Fallo controlado del pipeline: run #6 fallida, run #7 en verde.

## [0.2.0] - 2026-10-17
### Añadido
- Integración continua en Azure Pipelines con agente autohospedado y en GitHub Actions (AB#352, AB#353, PR #4 y #5).

## [0.1.0] - 2026-10-17
### Añadido
- Estructura del repositorio, backlog en Azure Boards, modelo de datos y migración inicial (AB#342, PR #1).
- API de incidentes: crear y consultar (AB#343, PR #2) y filtros por estado, prioridad, categoría y técnico (AB#344, PR #3).

## Tabla de versiones

| Versión | Commit en `main` | Hito |
|---|---|---|
| v0.1.0 | `06090c6` | Base y primeros módulos (semana 1) |
| v0.2.0 | `dcf8649` | CI en Azure y GitHub |
| v0.2.1 | `27fbdd0` | Corrección con fallo controlado |
| v0.3.0 | `c5b20b6` | Frontend: lista y filtros |
| v0.4.0 | `02efbba` | Operación y bitácora |
| v0.5.0 | `418b2b1` | Funcionalidad completa |
| v0.6.0 | `be33033` | Deuda técnica resuelta |
| v0.7.0 | `b924d7b` | Secretos |
| v0.8.0 | `fd0bb21` | Ambientes y aprobaciones |
| v0.9.0 | `e52604c` | Versionado y candidata a 1.0.0 |
| v0.9.1 | commit de este PR | Corrección del despliegue con ZIP de builds anteriores |
| v1.0.0 | pendiente | Release final |
