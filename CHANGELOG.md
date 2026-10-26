# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).
Cada entrada indica los Work Items (`AB#ID`) y Pull Requests que la componen. Los tags `vX.Y.Z` apuntan al commit de `main` que cierra cada versión.

> **Nota de transparencia:** el desarrollo de las versiones 0.1.0 a 0.8.0 ocurrió entre el 17 y el 18 de octubre de 2026.
> Los tags de esas versiones se crearon el 20 de octubre de 2026 sobre los commits de `main` que cierran cada hito
> (la fecha del tag es la de su creación; la fecha de cada commit es la real).

## [Sin publicar]
- Siguientes mejoras (ver `docs/technical-debt.md`): pruebas contra PostgreSQL real y transacciones (D3, D4), límite de intentos de login y revocación de tokens (D10, D11), paginación (D7).

## [1.1.0] - 2026-10-25
Inicio de sesión con roles y asignación automática por categoría (resuelve la deuda D5, Feature AB#375).
### Añadido
- **Inicio de sesión** con correo y contraseña: hash scrypt con sal, token HS256 de 8 horas, `GET /api/auth/me`, cierre de sesión y vuelta al login si la sesión expira (AB#379, AB#380, AB#381; PR #26 y #28).
- **Tres roles** con permisos aplicados en el backend: el solicitante ve solo sus incidentes; el técnico ve las categorías que atiende y cambia el estado de lo que tiene asignado; el administrador ve y gestiona todo (AB#383, AB#384; PR #27 y #28).
- **Asignación automática por categoría**: el incidente nuevo va al técnico que atiende esa categoría con menos incidentes abiertos; un técnico de telecomunicaciones solo ve temas de telecomunicaciones (AB#386, AB#387).
- Migración `002_auth.sql` (`users.password_hash` y `tecnico_categorias`) y usuarios de demostración de los 3 roles en el seed.
- Estadísticas del dashboard limitadas a lo que cada rol puede ver.
- Pruebas: matriz de permisos por rol, visibilidad, asignación automática, tokens, login, sesión y expiración (AB#382, AB#385, AB#388).
### Cambiado
- Todas las rutas de `/api` exigen sesión (excepto `login`, `/api/workflow` y `/health`). **Cambio incompatible para clientes de la API**: ya no se envían `autor_id` ni `solicitante_id`; salen del token.
- Se elimina el selector provisional «Actuando como» de la interfaz.
### Seguridad
- `AUTH_SECRET` obligatoria con `NODE_ENV=production`. Documentación en `docs/security.md`.
- Deuda nueva registrada: D10 (sin límite de intentos de login) y D11 (tokens sin revocación y en `sessionStorage`).
### Equipo
- Trabajo repartido entre las 3 cuentas de GitHub del equipo: SotoJ08 (backend), DharaGar29 (frontend) y Edd210 (pruebas y seguridad).

## [1.0.0] - 2026-10-24
Primera versión estable: cierra el alcance funcional y de proceso del proyecto integrador.
### Corregido
- Vulnerabilidad alta en `body-parser` (<1.20.9, GHSA-27r3-jxmh-p828) detectada por `npm audit` en la run #39; actualizado a 1.20.9 (Bug AB#374, PR #25).
### Añadido
- README completo (requisitos, instalación, ejecución, API, proceso DevOps y equipo) y documentación de arquitectura (AB#370, PR #21).
- Equipo de 3 integrantes simulados con cuentas de GitHub y correos propios, con transparencia sobre el historial anterior (AB#372).
### Estado del proyecto en esta versión
- Todas las áreas funcionales del enunciado de punta a punta: incidentes, operación, bitácora, filtros, dashboard y API con PostgreSQL.
- Proceso DevOps: Azure Boards, ramas y PR con `AB#ID`, CI en Azure Pipelines con agente autohospedado y en GitHub Actions, fallo controlado del pipeline (run #6 y #34 fallidas y corregidas), secretos protegidos, análisis de dependencias, deuda técnica (2 de 9 resueltas), SemVer y despliegue por ambientes con aprobaciones y rollback.
- Limitaciones conocidas: sin autenticación (D5), pruebas con pg-mem (D4) y despliegue por ambientes local; ver `docs/technical-debt.md`.

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
| v0.9.1 | `f15b010` | Corrección del despliegue con ZIP de builds anteriores |
| v1.0.0 | `4061e91` | Primera versión estable |
| v1.1.0 | commit del merge a `main` | Inicio de sesión con roles y asignación automática |
