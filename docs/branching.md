# Estrategia de ramas

## Reglas
- **`main` siempre estable:** solo recibe cambios mediante Pull Request, con descripción, Work Item vinculado, evidencia de validación (comentario con la corrida del pipeline) y voto de aprobación.
- **Ramas de trabajo** con el Work Item en el nombre:
  - `feature/<AB#ID>-descripcion` para funcionalidad nueva.
  - `fix/<AB#ID>-descripcion` para correcciones.
  - `refactor/<AB#ID>-descripcion` para cambios internos sin cambio de comportamiento.
  - Además se usaron `docs/<AB#ID>-...` para documentación y `release/<AB#ID>-...` para preparar versiones.
- **Commits** con referencia al Work Item: `feat: crear incidente AB#12`. Tipos usados: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`.
- **Versiones:** tags anotados `vMAJOR.MINOR.PATCH` (SemVer) sobre `main`; ver [release-strategy.md](release-strategy.md).

## Flujo
```
Work Item (Azure Boards) -> rama desde main -> commits con AB#ID -> push a Azure Repos (y espejo en GitHub)
  -> Pull Request con descripcion y Work Item -> pipeline en la rama -> comentario con la evidencia
  -> aprobacion -> merge a main -> pipeline de main (CI + despliegue a dev) -> cierre del Work Item
```

## Estrategia de fusión (importante para la autoría)
- Las fusiones a `main` se hacen con **merge commit** (`noFastForward`), no con *squash*: así cada commit conserva a su autor original y GitHub lo enlaza a la cuenta correcta.
- Hasta el PR #22 se usó *squash*; esos commits aparecen firmados por el usuario de Azure DevOps (`2311686 - JESUS EDUARDO SOTO`). Desde el PR #23 se usa merge commit. El historial no se reescribió.
- Para funcionalidades de varias piezas se usó una **rama de integración** (`feature/login-roles`): cada pieza tuvo su rama, su PR y su corrida del pipeline, y al final un solo PR a `main`. Así `main` nunca quedó a medias.
- Cuando una rama apilada quedó desfasada por un *squash* previo, se **reubicó** sobre `main` (`git rebase --onto`, `--force-with-lease`) solo en ramas propias de trabajo; `main` nunca se reescribe.

## Quién firma qué
Tres cuentas de GitHub (SotoJ08, DharaGar29, Edd210), cada una con su correo verificado; ver el README y `docs/evidencia/contribuciones.txt`.

## Protecciones y límites conocidos
- La política de **validación de build** en las ramas de Azure Repos no está configurada (deuda D8): el pipeline en cada rama se lanza explícitamente y su resultado se anota en el PR.
- La aprobación del PR la da la misma identidad de Azure DevOps (proyecto individual).
