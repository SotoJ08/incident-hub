# Análisis de dependencias

Herramienta: `npm audit` (se ejecuta en Azure Pipelines y GitHub Actions; el pipeline falla en severidad high/critical).

| Fecha | Componente | Paquete | Vulnerabilidad | Severidad | Decisión |
|---|---|---|---|---|---|
| 2026-10-17 | frontend (dev) | vite 5.4 | Path traversal en `.map` de deps optimizadas (GHSA-4w7w-66w2-5vf9) y NTLMv2 vía launch-editor en Windows | **high** | **Corregida**: actualizar a vite 8.3.4 (AB#345) |
| 2026-10-17 | frontend (dev) | vitest 2.1 / tinypool | Prototype pollution a RCE en tinypool (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr); lectura de archivos con Vitest UI (GHSA-5xrq-8626-4rwp) | **critical** | **Corregida**: actualizar a vitest 5.0.5 (AB#345) |
| 2026-10-17 | frontend (dev) | esbuild | Cualquier sitio puede enviar peticiones al servidor de desarrollo (GHSA-67mh-4wv8-2f99) | moderate | **Corregida** con vite 8 |
| 2026-10-17 | frontend (dev) | @vitest/mocker, vite-node | Path traversal / dependencia transitiva de vite | moderate | **Corregida** con vitest 5 |
| 2026-10-17 | backend | express, pg, pg-mem, supertest | Sin hallazgos | - | Sin acción; se revisa en cada corrida |

Resultado tras la actualización: `npm audit` = 0 vulnerabilidades en backend y frontend.
Nota: todas las vulnerabilidades eran de dependencias de **desarrollo**; no llegan al artefacto de producción.
