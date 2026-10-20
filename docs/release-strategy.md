# Estrategia de release

## Visión
```
PR -> revisión -> main -> CI (build, pruebas, audit, escáner) -> artefacto -> dev (auto) -> staging (aprobación) -> prod (aprobación)
```
Un mismo artefacto (`incident-hub`: ZIP de backend y frontend) se **construye una vez** y se promueve entre ambientes; no se recompila para cada ambiente.

## Versionado
- Semantic Versioning `vMAJOR.MINOR.PATCH`. La versión vive en `backend/package.json` y `frontend/package.json` (siempre la misma) y cada despliegue se identifica como `<version>-b<build>`.
- **Cuándo sube cada número:** `MINOR` al fusionar una funcionalidad o mejora de proceso nueva; `PATCH` al fusionar una corrección (`fix/*`); `MAJOR` queda reservado para cambios incompatibles tras `v1.0.0`.
- **Secuencia real:** `0.1.0 -> 0.2.0 -> 0.2.1 (fix) -> 0.3.0 -> 0.4.0 -> 0.5.0 -> 0.6.0 -> 0.7.0 -> 0.8.0 -> 0.9.0 (candidata) -> 1.0.0`. El detalle, con Work Items y PR por versión, está en [CHANGELOG.md](../CHANGELOG.md).
- **Hitos equivalentes a las entregas parciales** (un único repositorio): `v0.1.0` primeros módulos (semana 1), `v0.5.0` funcionalidad completa (semana 2) y `v1.0.0` release final (semana 3).
- Los tags son **anotados**, se crean sobre `main` con el pipeline en verde y se publican en Azure Repos y GitHub.
- Las versiones `0.1.0` a `0.8.0` se etiquetaron el 2026-10-20 sobre los commits que cierran cada hito, porque el versionado formal (AB#356) se adoptó después del desarrollo. Ver la nota de transparencia del CHANGELOG.
- `tests/versions.test.js` impide publicar versiones incoherentes: backend y frontend iguales, `CHANGELOG` ordenado y su entrada más reciente igual a la versión actual.

## Ambientes

| Ambiente | Environment en Azure DevOps | Disparo | Control |
|---|---|---|---|
| dev | `incident-hub-dev` | Automático al terminar el CI en `main` | Pipeline verde |
| staging | `incident-hub-staging` | Tras dev correcto | **Aprobación manual** (check *Approval* configurado) |
| prod | `incident-hub-prod` | Tras staging correcto | **Aprobación manual** (check *Approval* configurado) |

- Las ramas `feature/*`, `fix/*` y `refactor/*` ejecutan solo el CI: los *stages* de despliegue tienen la condición `Build.SourceBranch == refs/heads/main`.
- Cada despliegue deja un release versionado en `<agente>/_work/deploy/<ambiente>/<version>-b<build>/` con `backend/`, `frontend/` y `release.json` (versión, build, commit y fecha). `current.json` apunta al release vigente y al anterior.
- **Alcance real del despliegue:** es un despliegue sobre el agente autohospedado (carpetas por ambiente), suficiente para demostrar promoción, aprobaciones, validación y rollback. No publica en un servidor externo.

## Controles
1. **Antes del despliegue:** CI en verde (build, pruebas, `npm audit`, escáner de secretos, variable group disponible).
2. **Aprobación:** staging y prod pausan el pipeline hasta que el aprobador lo autoriza (Pipelines -> Environments -> *Approvals and checks*).
3. **Validación posterior:** el paso `deploy.js estado` lee el `release.json` vigente y falla si no coincide con lo desplegado.
4. **Trazabilidad:** cada release guarda el commit; cada commit referencia su Work Item (`AB#ID`) y su PR.

## Rollback
Todos los ambientes conservan el release anterior. Para volver atrás sin recompilar:

```
node devops/scripts/deploy.js rollback --entorno <dev|staging|prod> --raiz <agente>/_work/deploy
node devops/scripts/deploy.js estado   --entorno <dev|staging|prod> --raiz <agente>/_work/deploy
```
El rollback intercambia `actual` y `anterior`, por lo que también se puede revertir el rollback. Después se crea un Bug que explique la causa y se corrige mediante `fix/*` y PR.

## Checklist de release
- [ ] Todos los PR del hito fusionados y sus Work Items cerrados.
- [ ] Pipeline de `main` en verde y GitHub Actions en verde.
- [ ] `npm audit` sin high/critical (o decisión registrada en [dependencies.md](dependencies.md)).
- [ ] Deudas nuevas registradas en [technical-debt.md](technical-debt.md).
- [ ] Despliegue en dev validado.
- [ ] Aprobación a staging, validación y pruebas manuales de humo.
- [ ] Aprobación a prod y validación posterior.
- [ ] Tag `vX.Y.Z` y notas de la versión.

## Configuración de los environments (una sola vez)
Pipelines -> Environments -> `incident-hub-dev`, `incident-hub-staging` e `incident-hub-prod` (ya creados). En staging y prod hay un check **Approval** (aprobador: responsable del release, espera máxima 12 h).

Mejora recomendada, aún no configurada: añadir en staging y prod el check **Branch control** (solo `refs/heads/main`). Hoy la restricción a `main` la garantiza la condición de los *stages* de despliegue; el check lo reforzaría a nivel de ambiente.

Al ser un proyecto individual, el aprobador es la misma persona que ejecuta el pipeline; por eso el equipo simula roles (ver README) y la aprobación queda registrada con su fecha en el historial de la corrida.
