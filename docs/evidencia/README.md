# Evidencia exportada

Datos reales exportados el **25 de octubre de 2026** de Azure DevOps, GitHub y Git. Las horas son UTC en los exportes de Azure/GitHub y hora local (Guatemala) en `historial-git.csv`.

| Archivo | Contenido | Origen |
|---|---|---|
| `backlog-azure-boards.csv` | 62 Work Items: tipo, estado, padre, título, prioridad, puntos, estimación, responsable y etiquetas | Azure Boards (WIQL + `_apis/wit/workitems`) |
| `pull-requests.csv` | 30 PR: ramas, título, Work Items vinculados, revisión y fechas | Azure Repos (`_apis/git/.../pullrequests`) |
| `pipeline-runs.csv` | 49 corridas de `incident-hub-ci`: rama, resultado, disparo y horas (fallidas: #6, #34, #38, #39, #48) | Azure Pipelines (`_apis/build/builds`) |
| `github-actions-runs.csv` | 20 ejecuciones de GitHub Actions: 19 por `push` a `main` y 1 por `pull_request` (PR #1 de GitHub) | API pública de GitHub |
| `historial-git.csv` | Todos los commits (sin merges): hash, autor, correo, fecha, mensaje con `AB#ID` | `git log` |
| `contribuciones.txt` | Commits por autor en `main` y cuenta de GitHub enlazada | `git shortlog` + API de GitHub |
| `tags.txt` | 13 tags anotados `v0.1.0` a `v1.1.0` | `git for-each-ref` |
| `ramas.txt` | Ramas remotas | `git branch -r` |

## Cómo regenerarlos
- **Git:** `git log --reverse --no-merges --format='%h|%an|%ae|%ad|%s' --date=format:'%Y-%m-%d %H:%M' main` y `git shortlog -sne --no-merges main`.
- **Azure DevOps** (con sesión iniciada, desde la consola del navegador en `dev.azure.com/jsoto1`): `GET /incident-hub/_apis/wit/wiql`, `GET /_apis/wit/workitems?ids=...`, `GET /_apis/git/repositories/incident-hub/pullrequests?searchCriteria.status=all` y `GET /_apis/build/builds?definitions=2`.
- **GitHub Actions:** `GET https://api.github.com/repos/SotoJ08/incident-hub/actions/runs`.

## Qué mirar
- **Fallos controlados:** corridas #6, #34, #38, #39 y #48 (fallidas) y las que las siguen en verde; ver `../ci-failure-diagnosis.md`.
- **Corridas "inProgress" de `main`:** esperan la aprobación manual de staging (el control funciona como se diseñó).
- **Autoría:** `contribuciones.txt` muestra los commits enlazados a las tres cuentas.
