# Análisis de dependencias

Herramienta: `npm audit` (se ejecuta en Azure Pipelines y GitHub Actions; el pipeline falla en severidad high/critical).

| Fecha | Componente | Paquete | Vulnerabilidad | Severidad | Decisión |
|---|---|---|---|---|---|
| 2026-10-17 | frontend (dev) | vite 5.4 | Path traversal en `.map` de deps optimizadas (GHSA-4w7w-66w2-5vf9) y NTLMv2 vía launch-editor en Windows | **high** | **Corregida**: actualizar a vite 8.3.4 (AB#345) |
| 2026-10-17 | frontend (dev) | vitest 2.1 / tinypool | Prototype pollution a RCE en tinypool (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr); lectura de archivos con Vitest UI (GHSA-5xrq-8626-4rwp) | **critical** | **Corregida**: actualizar a vitest 5.0.5 (AB#345) |
| 2026-10-17 | frontend (dev) | esbuild | Cualquier sitio puede enviar peticiones al servidor de desarrollo (GHSA-67mh-4wv8-2f99) | moderate | **Corregida** con vite 8 |
| 2026-10-17 | frontend (dev) | @vitest/mocker, vite-node | Path traversal / dependencia transitiva de vite | moderate | **Corregida** con vitest 5 |
| 2026-10-17 | backend | express, pg, pg-mem, supertest | Sin hallazgos | - | Sin acción; se revisa en cada corrida |
| 2026-10-24 | backend (**producción**) | body-parser 1.20.8 (transitiva de express 4.22.3) | Denegación de servicio por bytes finales tras un cuerpo comprimido (GHSA-27r3-jxmh-p828) | **high** | **Corregida**: `npm audit fix` actualiza a body-parser 1.20.9 (parche dentro del rango de express; solo cambia `package-lock.json`) (Bug AB#374) |

## Hallazgos y decisiones
- **2026-10-17 (frontend, solo desarrollo):** 6 vulnerabilidades (1 high, 2 critical) en vite 5 y vitest 2; se resolvieron actualizando a vite 8 y vitest 5. No llegaban al artefacto de producción.
- **2026-10-24 (backend, producción):** el aviso de `body-parser` se publicó **después** de varias corridas en verde y rompió la run #39 de Azure Pipelines en el paso "Revisión de dependencias" (`npm audit --audit-level=high`). El gate funcionó como se diseñó: bloqueó el avance hasta decidir. Decisión: actualizar el parche (sin cambios de código), comprobar las 52 pruebas del backend y mantener el gate en high/critical. Esta dependencia **sí forma parte del artefacto de producción**, por eso se trató como Bug de prioridad alta.

Resultado actual: `npm audit` = 0 vulnerabilidades en backend y frontend.
Lección: los avisos de seguridad aparecen con el tiempo; por eso el análisis se ejecuta en **cada** corrida y no solo al instalar.
