# Fuentes del documento técnico

El documento `docs/IT-Incident-Hub-Documentacion.docx` (y su PDF) se genera desde estos archivos, para poder actualizarlo cuando cambie el sistema.

| Archivo | Función |
|---|---|
| `content1.js`, `content2.js` | Contenido del documento (capítulos, tablas, fichas) como datos |
| `diagrams.py` | Dibuja los 7 diagramas con Pillow (`diagramas/*.png`) |
| `lib.js` | Genera el Word (librería `docx`) y el HTML para el PDF |
| `build.js`, `pass2.py`, `pdf.ps1` | Orquesta la generación: Word, HTML, PDF con Chrome y numeración de la tabla de contenido |
| `crop.py` | Recorta las capturas de pantalla |

Requisitos: Node 22 con el paquete `docx`, Python 3 con `pillow` y `pymupdf`, y Google Chrome. Las rutas `img/` y `out/` se crean junto a los scripts (copie `diagramas/` y `capturas/` a `img/`).
