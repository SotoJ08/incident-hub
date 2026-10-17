# Estrategia de ramas

- `main`: siempre estable; solo recibe cambios vía Pull Request con revisión y pipeline verde.
- Ramas de trabajo: `feature/<AB#ID>-descripcion`, `fix/<AB#ID>-descripcion`, `refactor/<AB#ID>-descripcion`.
- Commits: mensaje con referencia al Work Item, ej. `feat: crear incidente AB#12`.
- PR: descripción, Work Item vinculado, evidencia de validación y al menos una revisión.
- Versiones: tags `vMAJOR.MINOR.PATCH` (SemVer) sobre `main`.
