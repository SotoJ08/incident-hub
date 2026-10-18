# Seguridad

## Principios
- **Ningún secreto en el repositorio, en capturas ni en documentación.** `.env` y `.env.*` están en `.gitignore`; solo se versiona `.env.example` con valores vacíos o marcadores.
- Los secretos viven en **variables protegidas**: variable group de Azure DevOps y GitHub Secrets.
- Las dependencias se revisan en cada corrida (`npm audit`, falla en high/critical); ver [dependencies.md](dependencies.md).

## Inventario de secretos

| Secreto | Uso | Azure DevOps | GitHub |
|---|---|---|---|
| `DB_PASSWORD` | Contraseña de PostgreSQL (`docker-compose.yml` y `DATABASE_URL`) | Variable group `incident-hub-secrets` (secreta) | Secret `DB_PASSWORD` |
| PAT del agente | Registrar el agente autohospedado | Solo se usa en la consola al ejecutar `config.cmd`; se revoca después | - |

## Cómo se crean (los valores los escribe una persona, nunca un script ni un commit)

### Azure DevOps - variable group protegido
1. Pipelines -> **Library** -> **+ Variable group**.
2. Nombre: `incident-hub-secrets`.
3. Agregar la variable `DB_PASSWORD`, escribir el valor y pulsar el **candado** para marcarla como secreta (después de guardar ya no se puede leer).
4. **Pipeline permissions**: permitir solo al pipeline `incident-hub-ci`.
5. Guardar.

### GitHub - Secrets
1. Repositorio -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.
2. Nombre `DB_PASSWORD`, pegar el valor y guardar.

## Cómo se usan sin exponerlos
- **Azure Pipelines:** `variables: - group: incident-hub-secrets`. Una variable secreta **no** llega sola a los scripts: el paso la mapea con `env:` (`DB_PASSWORD: $(DB_PASSWORD)`). Azure enmascara el valor (`***`) en los logs.
- **GitHub Actions:** `env: DB_PASSWORD: ${{ secrets.DB_PASSWORD }}`. Los secrets no se entregan a PR de forks, por eso se verifican solo en `push` a `main`.
- `devops/scripts/verify-secret.js NOMBRE` confirma que el secreto llegó **sin imprimir su valor**; si falta, el CI falla con un mensaje claro.

## Controles automáticos
| Control | Dónde | Qué evita |
|---|---|---|
| `devops/scripts/check-secrets.js` | Azure Pipelines y GitHub Actions | Claves privadas, tokens de GitHub, claves AWS, PAT de Azure DevOps, credenciales en URL y asignaciones literales de password/token en archivos versionados. Reporta archivo y línea, **nunca el valor**. |
| `tests/secrets.test.js` | Ambos CI | Verifica las reglas del escáner con valores falsos armados en tiempo de ejecución |
| `.gitignore` | Repositorio | `.env`, `*.pem`, `*.pfx`, `devops/agent/` |
| `docker-compose.yml` | Local | `DB_PASSWORD` es obligatoria (`:?`): no hay contraseña por defecto |

## Si un secreto se expone
1. **Rotarlo de inmediato** (nuevo valor en la fuente real: base de datos, Azure, GitHub).
2. Actualizar el variable group y el GitHub Secret.
3. Revocar el valor expuesto (PAT, token). Borrar el commit no basta: queda en el historial.
4. Registrar el incidente como Work Item.

## Limitaciones conocidas
- Autenticación de usuarios pendiente: ver deuda D5 en [technical-debt.md](technical-debt.md).
- El escáner es un control propio sencillo; no sustituye a una herramienta dedicada (p. ej. gitleaks) ni revisa el historial de Git, solo los archivos versionados actuales.
