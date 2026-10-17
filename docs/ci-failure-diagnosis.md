# Fallo controlado del pipeline (AB#358)

| Paso | Detalle |
|---|---|
| Work Item | Bug AB#358, hijo de la US2 (AB#335) |
| Rama / PR | `fix/358-orden-listado` / PR #6 |
| Corrida fallida | `incident-hub-ci` run #6 - fallo en el paso **Pruebas**; Revision de dependencias, Empaquetado y Artefacto quedaron *skipped* |
| Sintoma | `GET lista primero el incidente mas reciente (AB#358)`: `actual: [1, 2]`, `expected: [2, 1]` |
| Causa raiz | La constante `ORDEN_LISTADO` se extrajo con `created_at ASC, id ASC` (regresion introducida a proposito en el primer commit) |
| Correccion | `ORDEN_LISTADO = 'created_at DESC, id DESC'` (segundo commit) |
| Verificacion | Pruebas locales 20/20 y nueva corrida del pipeline en verde |
| Leccion | La prueba de orden detecto la regresion antes de llegar a `main`; el pipeline impide publicar el artefacto si falla un paso previo |
