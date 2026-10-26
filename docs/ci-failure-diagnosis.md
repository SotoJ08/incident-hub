# Fallos controlados y fallos reales del pipeline

El enunciado pide conservar evidencia de **al menos un pipeline fallido, su diagnóstico, corrección y ejecución exitosa**. Aquí hay cinco casos: uno **provocado a propósito** (AB#358) y cuatro **reales**, detectados por los propios controles del pipeline. Todos se resolvieron con el mismo flujo: Work Item, rama, PR y nueva corrida. Datos completos en `evidencia/pipeline-runs.csv`.

| # | Corrida fallida | Paso que falló | Causa | Work Item / PR de la corrección | Corrida en verde |
|---|---|---|---|---|---|
| 1 | **#6** (`fix/358-orden-listado`) | Pruebas | Regresión introducida a propósito (orden ascendente en el listado) | Bug AB#358, PR #6 | **#7** |
| 2 | **#34** (`main`) | Desplegar a dev | El workspace del agente autohospedado conservaba el ZIP de una corrida anterior («hay 2») | Bug AB#371, PR #22 | **#36** (rama) y **#37** (`main`, `0.9.1-b37` desplegado) |
| 3 | **#38** y **#39** (`main` y `docs/372`) | Revisión de dependencias | Aviso nuevo de seguridad (high) en `body-parser` <1.20.9 | Bug AB#374, PR #25 | **#40** |
| 4 | **#48** (`feature/381-login-ui`) | Escáner de secretos | El escáner detectó literales con forma de token y contraseña en las pruebas del frontend | AB#385, commit en el PR #28 | **#50** |
| 5 | GitHub Actions, push a `main` del 25-oct | Revisión de dependencias | Mismo aviso de `body-parser` | AB#374 | Ejecuciones siguientes en verde |

---

## Caso 1 - Fallo provocado (AB#358, run #6 → #7)

| Paso | Detalle |
|---|---|
| Work Item | Bug AB#358, hijo de la US2 (AB#335) |
| Rama / PR | `fix/358-orden-listado` / PR #6 |
| Corrida fallida | `incident-hub-ci` run #6: fallo en **Pruebas**; Revisión de dependencias, Empaquetado y Artefacto quedaron *skipped* |
| Síntoma | `GET lista primero el incidente mas reciente (AB#358)`: `actual: [1, 2]`, `expected: [2, 1]` |
| Causa raíz | La constante `ORDEN_LISTADO` se extrajo con `created_at ASC, id ASC` (regresión introducida a propósito en el primer commit) |
| Corrección | `ORDEN_LISTADO = 'created_at DESC, id DESC'` (segundo commit) |
| Verificación | Pruebas locales 20/20 y corrida #7 en verde |
| Lección | La prueba de orden detectó la regresión antes de llegar a `main`; el pipeline impide publicar el artefacto si falla un paso previo |

## Caso 2 - Fallo real del despliegue (AB#371, run #34 → #37)
- **Síntoma:** en `main`, el paso «Desplegar a dev» falló con `se esperaba un zip incident-hub-backend-*.zip ... y hay 2`.
- **Diagnóstico:** el log del paso mostró que la carpeta del artefacto contenía los ZIP de dos builds. En un agente **autohospedado** el workspace no se limpia entre corridas.
- **Corrección:** `buscarZip` usa el nombre exacto `incident-hub-<componente>-<build>.zip`; 3 pruebas nuevas y una prueba de punta a punta con ZIP reales de las builds 32 y 34.
- **Resultado:** la corrida #37 de `main` desplegó `0.9.1-b37` a dev y lo validó.

## Caso 3 - Aviso de seguridad nuevo (AB#374, runs #38 y #39 → #40)
- **Síntoma:** `npm audit --audit-level=high` falló: `body-parser <1.20.9` (denegación de servicio, GHSA-27r3-jxmh-p828). El aviso se publicó **después** de varias corridas en verde.
- **Decisión:** `npm audit fix` (parche dentro del rango de Express; solo cambió `package-lock.json`), 52 pruebas del backend en verde y registro en `dependencies.md`. Esta dependencia **sí llega a producción**, por eso se trató como Bug de prioridad alta.
- **Lección:** los avisos aparecen con el tiempo; el análisis debe ejecutarse en cada corrida, como se hace.

## Caso 4 - El escáner de secretos detectó mis pruebas (AB#385, run #48 → #50)
- **Síntoma:** el paso «Escáner de secretos» falló con 3 hallazgos en `frontend/test` (`asignacion-secreta`).
- **Diagnóstico:** eran **falsos positivos** (un token y una contraseña falsos escritos como literales en las pruebas), pero la regla del proyecto es no dejar valores con esa forma.
- **Corrección:** el token y la contraseña falsos se construyen en tiempo de ejecución (`fixtures.js`); la corrida #49 se canceló por haberse lanzado sin la corrección y la #50 pasó.
- **Lección:** el control se prueba a sí mismo: ya había detectado su propio comentario como credencial en URL (AB#355).
