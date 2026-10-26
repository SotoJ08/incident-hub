# Seguridad

## Principios
- **Ningún secreto en el repositorio, en capturas ni en documentación.** `.env` y `.env.*` están en `.gitignore`; solo se versiona `.env.example` con valores vacíos o marcadores.
- Los secretos viven en **variables protegidas**: variable group de Azure DevOps y GitHub Secrets.
- Las dependencias se revisan en cada corrida (`npm audit`, falla en high/critical); ver [dependencies.md](dependencies.md).
- **Mínimo privilegio en la aplicación:** cada rol ve y hace solo lo que necesita (ver más abajo).

## Autenticación y autorización (v1.1.0, AB#375)

### Inicio de sesión
- `POST /api/auth/login` con correo y contraseña. La contraseña se guarda **solo como hash scrypt con sal** (`scrypt$sal$hash`) y se compara en **tiempo constante**.
- Un correo inexistente y una contraseña incorrecta responden **igual** (401 `credenciales invalidas`) y con el mismo coste de cálculo (hash de relleno), para no revelar qué correos existen.
- Si el login es correcto, el backend entrega un **token HS256** (firmado con HMAC-SHA256, validez de 8 horas). Se rechazan tokens con otra firma, alterados, expirados, mal formados o con `alg: none`.
- El rol y las categorías del usuario **se leen de la base de datos en cada petición**: quitar un permiso o cambiar el rol surte efecto de inmediato, sin esperar a que expire el token.
- El cliente **nunca decide quién actúa**: el autor de la bitácora, de un comentario y el solicitante de un incidente salen del token. Un cuerpo de petición con `autor_id` o `solicitante_id` se ignora.

### Roles y permisos
| Acción | Solicitante | Técnico | Administrador |
|---|---|---|---|
| Ver incidentes | Solo los que reportó | Los de las categorías que atiende | Todos |
| Crear incidente | Sí (se asigna solo) | Sí | Sí |
| Comentar | En los que ve | En los que ve | En los que ve |
| Asignar o reasignar técnico | No (403) | No (403) | Sí, a un técnico que atienda la categoría |
| Cambiar estado | No (403) | Solo los asignados a él | Sí |
| Dashboard | De sus incidentes | De sus categorías | Global |

- Un incidente fuera del alcance de un usuario responde **404** (no se revela que existe); si lo ve pero no puede operarlo, responde **403**.
- **Asignación automática:** al crear un incidente se asigna al técnico que atiende esa categoría con **menos incidentes abiertos** (empate: menor id). Queda en la bitácora. Si ningún técnico atiende la categoría, queda `NUEVO` para que un administrador lo asigne. Un técnico de telecomunicaciones solo recibe y ve temas de telecomunicaciones.

### Configuración
- `AUTH_SECRET` (variable de entorno) firma los tokens. **Es obligatoria con `NODE_ENV=production`**; en desarrollo, si falta, se usa un secreto aleatorio por proceso (las sesiones se pierden al reiniciar) y el servidor avisa.
- Las pruebas usan un secreto fijo de prueba que no sirve para nada fuera de ellas.
- **Usuarios de demostración:** el seed (`database/seed.sql`) crea usuarios de los 3 roles con una **contraseña de prueba común**, documentada en el [README](../README.md#usuarios-de-demostración). Solo el hash está en el repositorio. **No usar el seed en un ambiente real.**

## Inventario de secretos

| Secreto | Uso | Azure DevOps | GitHub |
|---|---|---|---|
| `DB_PASSWORD` | Contraseña de PostgreSQL (`docker-compose.yml` y `DATABASE_URL`) | Variable group `incident-hub-secrets` (secreta) | Secret `DB_PASSWORD` |
| `AUTH_SECRET` | Firma de los tokens de sesión | No aplica al CI (las pruebas usan un secreto propio); se define en el entorno de ejecución del servidor | - |
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
| `backend/test/permissions.test.js`, `access.test.js` | Ambos CI | Matriz de permisos por rol: visibilidad, 403 y 404 |
| `backend/test/auth.test.js`, `auth-routes.test.js` | Ambos CI | Hash, tokens (firma, expiración, `alg: none`) y login sin enumeración de usuarios |
| `.gitignore` | Repositorio | `.env`, `*.pem`, `*.pfx`, `devops/agent/` |
| `docker-compose.yml` | Local | `DB_PASSWORD` es obligatoria (`:?`): no hay contraseña por defecto |

## Si un secreto se expone
1. **Rotarlo de inmediato** (nuevo valor en la fuente real: base de datos, Azure, GitHub). Si es `AUTH_SECRET`, cambiarlo invalida todas las sesiones, que es lo deseado.
2. Actualizar el variable group y el GitHub Secret.
3. Revocar el valor expuesto (PAT, token). Borrar el commit no basta: queda en el historial.
4. Registrar el incidente como Work Item.

## Limitaciones conocidas
- **Sin límite de intentos de login** (fuerza bruta) ni bloqueo de cuentas: deuda D10 en [technical-debt.md](technical-debt.md).
- **Sin revocación de tokens**: un token robado vale hasta 8 horas; cerrar sesión solo lo borra del navegador (deuda D11).
- El token se guarda en `sessionStorage`, accesible a scripts de la página si existiera una vulnerabilidad XSS; la interfaz no inserta HTML sin escapar, pero no hay cookies `HttpOnly` (deuda D11).
- La API debe servirse por **HTTPS** en un entorno real; el despliegue por ambientes actual es local.
- El escáner de secretos es un control propio sencillo; no sustituye a una herramienta dedicada (p. ej. gitleaks) ni revisa el historial de Git, solo los archivos versionados actuales.
