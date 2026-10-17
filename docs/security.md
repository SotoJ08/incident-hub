# Seguridad

- Ningún secreto en el repositorio (`.env` ignorado; solo `.env.example`).
- Pipelines: secretos en variable groups protegidos de Azure DevOps y GitHub Secrets.
- Revisión de dependencias en CI (`npm audit`) y decisión documentada en [dependencies.md](dependencies.md).
