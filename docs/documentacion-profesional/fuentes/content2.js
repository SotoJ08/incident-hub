const h1 = (x) => ({ t: 'h1', x });
const h2 = (x) => ({ t: 'h2', x });
const h3 = (x) => ({ t: 'h3', x });
const p = (x) => ({ t: 'p', x });
const ul = (...items) => ({ t: 'bullets', items });
const ol = (ref, ...items) => ({ t: 'numbered', ref, items });
const table = (cap, head, rows, w, boldFirst) => ({ t: 'table', cap, head, rows, w, boldFirst });
const kv = (cap, rows) => ({ t: 'kv', cap, rows });
const img = (f, cap, px) => ({ t: 'img', f, cap, px });
const shot = (f, cap, px) => ({ t: 'shot', f, cap, px });
const code = (x) => ({ t: 'code', x });
const note = (title, x, k) => ({ t: 'note', title, x, k });

module.exports = [
  // ============================================================ 7 COMPORTAMIENTO
  h1('7. Diseño del comportamiento'),
  h2('7.1 Ciclo de vida del incidente'),
  img('04-estados.png', 'Diagrama de estados del incidente', 600),
  table('Transiciones permitidas', ['Desde', 'Hacia', 'Quién', 'Condición'], [
    ['(creación)', 'NUEVO o ASIGNADO', 'Sistema', 'Queda ASIGNADO si la categoría tiene técnico (CU-09); si no, NUEVO'],
    ['NUEVO', 'ASIGNADO', 'Administrador', 'Asignación manual a un técnico de la categoría'],
    ['ASIGNADO', 'EN_PROCESO', 'Técnico asignado, Administrador', 'Debe tener técnico'],
    ['EN_PROCESO', 'RESUELTO', 'Técnico asignado, Administrador', 'Debe tener técnico'],
    ['RESUELTO', 'CERRADO', 'Técnico asignado, Administrador', 'Estado terminal'],
    ['RESUELTO', 'EN_PROCESO', 'Técnico asignado, Administrador', 'Reapertura del incidente'],
  ], [2, 2.4, 3.6, 4.5], true),
  p('Cualquier otra transición responde **409 Conflict** con la lista `permitidos`. La reasignación de técnico no cambia el estado, salvo en un incidente NUEVO, que pasa a ASIGNADO.'),
  h2('7.2 Secuencia: iniciar sesión y registrar un incidente'),
  img('05-secuencia.png', 'Secuencia de login y alta de un incidente con asignación automática', 610),
  p('La secuencia ilustra dos decisiones de diseño importantes: el middleware consulta el rol y las categorías del usuario **en cada petición**, de modo que un cambio de permisos surte efecto de inmediato, y el autor del incidente se toma del token, nunca del cuerpo de la petición.'),
  h2('7.3 Algoritmo de asignación automática'),
  code(`autoAssign(incidente, creadorId):
  candidatos = técnicos que atienden incidente.category_id
  si candidatos está vacío:
      devolver incidente en estado NUEVO          // requiere asignación manual
  para cada técnico: abiertos = nº de incidentes con tecnico_id = técnico y estado <> CERRADO
  elegido = técnico con el menor valor de abiertos (empate: menor id)
  UPDATE incidents SET tecnico_id = elegido, estado = 'ASIGNADO'
  INSERT incident_events (tipo = 'ASIGNACION', autor = creadorId, detalle = 'Asignado automáticamente a ...')
  devolver incidente actualizado`),
  p('El criterio de «menos incidentes abiertos» reparte la carga entre técnicos de la misma especialidad. Un técnico de telecomunicaciones solo recibe y ve incidentes de esa categoría.'),
  note('Limitación conocida (D3)', 'La actualización del incidente y la inserción del evento son dos consultas separadas, sin transacción. Si fallara la segunda, quedaría un incidente asignado sin su evento. Resolver esto exige pruebas contra PostgreSQL real (D4); ver el capítulo 15.', 'warn'),
  h2('7.4 Cálculo del alcance de visibilidad'),
  table('Función `scopeFor(usuario)` (condición SQL añadida a las consultas)', ['Rol', 'Condición sobre `incidents`', 'Efecto'], [
    ['ADMIN', 'ninguna', 'Ve todos los incidentes'],
    ['TECNICO', '`category_id` ∈ categorías que atiende', 'Ve los de su especialidad, incluso los de otro técnico de esa categoría'],
    ['SOLICITANTE', '`solicitante_id` = usuario de la sesión', 'Ve solo los que reportó'],
  ], [2, 5.5, 5]),
  p('La misma condición se aplica al listado, al detalle, al historial, a los comentarios y a las estadísticas, por lo que no existe una ruta que filtre información fuera del alcance. Un incidente ajeno responde 404, no 403, para no confirmar su existencia.'),

  // ============================================================ 8 API
  h1('8. Especificación de la API REST'),
  h2('8.1 Convenciones'),
  ul(
    'Base: `http://localhost:3000`. Formato JSON en peticiones y respuestas.',
    'Todas las rutas, salvo `GET /health`, `POST /api/auth/login` y `GET /api/workflow`, exigen el encabezado `Authorization: Bearer <token>`.',
    'Los errores devuelven `{ "errors": [ "mensaje", ... ] }`; las transiciones inválidas añaden `permitidos`.',
    'Códigos usados: 200, 201, 400 (datos inválidos), 401 (sin sesión válida), 403 (sin permiso), 404 (no existe o fuera de alcance), 409 (conflicto con el estado) y 500.',
  ),
  h2('8.2 Catálogo de endpoints'),
  table('Endpoints', ['Método', 'Ruta', 'Códigos', 'Descripción'], [
    ['GET', '`/health`', '200', 'Estado del servicio (público)'],
    ['POST', '`/api/auth/login`', '200, 400, 401', '`email`, `password` → `{ token, user }`'],
    ['GET', '`/api/auth/me`', '200, 401', 'Usuario de la sesión con rol y categorías'],
    ['POST', '`/api/incidents`', '201, 400, 401', '`titulo`, `descripcion`, `category_id`, `prioridad` opcional; asigna automáticamente'],
    ['GET', '`/api/incidents`', '200, 400, 401', 'Filtros `estado`, `prioridad`, `category_id`, `tecnico_id` (AND); más recientes primero; limitado por rol'],
    ['GET', '`/api/incidents/:id`', '200, 400, 401, 404', 'Detalle'],
    ['PATCH', '`/api/incidents/:id/assign`', '200, 400, 401, 403, 404, 409', 'Solo administrador; cuerpo `{ tecnico_id }`'],
    ['PATCH', '`/api/incidents/:id/status`', '200, 400, 401, 403, 404, 409', 'Administrador o técnico asignado; cuerpo `{ estado }`'],
    ['GET', '`/api/incidents/:id/events`', '200, 400, 401, 404', 'Bitácora cronológica; `?tipo=COMENTARIO|CAMBIO_ESTADO|ASIGNACION`'],
    ['POST', '`/api/incidents/:id/comments`', '201, 400, 401, 404, 409', '`{ comentario }` (máx. 2000)'],
    ['GET', '`/api/stats`', '200, 401', '`total`, `abiertos`, `cerrados`, `criticos`, `sin_asignar`, `por_estado`, `por_categoria`, `por_tecnico`'],
    ['GET', '`/api/categories`', '200, 401', 'Catálogo de categorías'],
    ['GET', '`/api/users?rol=`', '200, 401', 'Usuarios por rol (los técnicos incluyen `categorias`; sin correos ni hashes)'],
    ['GET', '`/api/workflow`', '200', 'Reglas del flujo de estados (público)'],
  ], [1.2, 4.2, 2.6, 6.4], true),
  h2('8.3 Ejemplos'),
  h3('Inicio de sesión'),
  code(`POST /api/auth/login
{ "email": "ana@example.com", "password": "<contraseña de prueba>" }

200 OK
{ "token": "<token HS256>", "user": { "id": 1, "nombre": "Ana Solicitante", "rol": "SOLICITANTE", ... } }

401 Unauthorized
{ "errors": [ "credenciales invalidas" ] }`),
  h3('Registrar un incidente'),
  code(`POST /api/incidents            Authorization: Bearer <token>
{ "titulo": "Sin internet en el piso 2", "descripcion": "Perdieron conexión desde las 14:00",
  "category_id": 4, "prioridad": "URGENTE" }

201 Created
{ "id": 8, "estado": "ASIGNADO", "tecnico_id": 5, "solicitante_id": 1, "category_id": 4, ... }`),
  h3('Transición inválida'),
  code(`PATCH /api/incidents/8/status  { "estado": "CERRADO" }     (el incidente está ASIGNADO)

409 Conflict
{ "errors": [ "transicion invalida: ASIGNADO -> CERRADO" ], "permitidos": [ "EN_PROCESO" ] }`),
  h3('Acceso fuera de alcance'),
  code(`GET /api/incidents/3     (usuario Luis, técnico de Equipo de cómputo; el incidente 3 es de Telecomunicaciones)

404 Not Found
{ "errors": [ "incidente no encontrado" ] }`),

  // ============================================================ 9 SEGURIDAD
  h1('9. Seguridad'),
  h2('9.1 Principios'),
  ul(
    '**Ningún secreto en el repositorio, en capturas ni en documentación.** `.env` y `.env.*` están en `.gitignore`; solo se versiona `.env.example` con valores vacíos.',
    '**Mínimo privilegio:** cada rol ve y hace solo lo necesario, y se verifica en el servidor.',
    '**Defensa en profundidad:** validación de entrada, restricciones en la base, escáner de secretos y análisis de dependencias en cada corrida.',
    '**Sin confianza en el cliente:** la identidad sale del token; el cuerpo de la petición no puede suplantar a otro usuario.',
  ),
  h2('9.2 Autenticación'),
  table('Mecanismos de autenticación', ['Aspecto', 'Implementación'], [
    ['Almacén de contraseñas', 'Solo el hash `scrypt$sal$hash` con sal aleatoria; comparación en tiempo constante'],
    ['Respuesta ante error', 'Correo inexistente y contraseña errónea responden igual (401 `credenciales invalidas`) y con el mismo costo de cálculo (hash de relleno), para evitar enumeración de usuarios'],
    ['Token', 'HS256 (HMAC-SHA256), vigencia de 8 horas; se rechazan firmas distintas, alteraciones, expiración, formato incorrecto y `alg: none`'],
    ['Secreto de firma', '`AUTH_SECRET`; obligatorio con `NODE_ENV=production`. En desarrollo, si falta, se genera uno aleatorio por proceso y el servidor avisa'],
    ['Datos de la sesión', 'Rol y categorías se leen de la base en cada petición: revocar un permiso aplica al instante'],
  ], [3, 9], true),
  h2('9.3 Autorización: matriz de permisos'),
  table('Matriz de permisos por rol', ['Acción', 'Solicitante', 'Técnico', 'Administrador'], [
    ['Ver incidentes', 'Solo los que reportó', 'Los de las categorías que atiende', 'Todos'],
    ['Crear incidente', 'Sí (se asigna solo)', 'Sí', 'Sí'],
    ['Comentar', 'En los que ve', 'En los que ve', 'En los que ve'],
    ['Asignar o reasignar técnico', 'No (403)', 'No (403)', 'Sí, a un técnico de la categoría'],
    ['Cambiar estado', 'No (403)', 'Solo los asignados a él', 'Sí'],
    ['Dashboard', 'De sus incidentes', 'De sus categorías', 'Global'],
  ], [3.2, 3, 3.4, 3.4], true),
  h2('9.4 Modelo de amenazas resumido'),
  table('Amenazas y controles', ['Amenaza', 'Control aplicado', 'Estado'], [
    ['Suplantación de otro usuario enviando `autor_id` o `solicitante_id`', 'Se ignoran los campos del cuerpo; la identidad sale del token (RN-07)', 'Mitigada'],
    ['Acceso a incidentes ajenos (referencia directa a objetos)', 'Alcance por rol en todas las consultas; 404 fuera de alcance', 'Mitigada'],
    ['Escalada de privilegios', 'Verificación de rol en el servidor; rol leído de la base en cada petición', 'Mitigada'],
    ['Falsificación o alteración del token', 'Firma HMAC verificada; `alg: none` rechazado; vigencia limitada', 'Mitigada'],
    ['Enumeración de usuarios en el login', 'Respuesta y costo idénticos para correo inexistente y contraseña errónea', 'Mitigada'],
    ['Fuga de secretos en el repositorio', 'Escáner `check-secrets.js` en cada corrida; `.gitignore`; variable group y GitHub Secrets', 'Mitigada'],
    ['Dependencias vulnerables', '`npm audit` en cada corrida con falla en high/critical', 'Mitigada'],
    ['Fuerza bruta contra contraseñas', 'No hay límite de intentos ni bloqueo de cuentas', '**Abierta (D10)**'],
    ['Robo de token', 'Sin revocación; token en `sessionStorage` (accesible ante un XSS); vigencia de 8 horas', '**Abierta (D11)**'],
    ['Interceptación de tráfico', 'La API debe publicarse por HTTPS; el entorno actual es local', '**Pendiente en producción real**'],
  ], [5, 5.6, 2.4]),
  h2('9.5 Gestión de secretos'),
  table('Inventario de secretos', ['Secreto', 'Uso', 'Dónde se guarda'], [
    ['`DB_PASSWORD`', 'Contraseña de PostgreSQL (`docker-compose.yml`, `DATABASE_URL`)', 'Variable group protegido `incident-hub-secrets` (Azure) y GitHub Secret'],
    ['`AUTH_SECRET`', 'Firma de los tokens de sesión', 'Entorno de ejecución del servidor; no forma parte del CI'],
    ['PAT del agente', 'Registrar el agente autohospedado', 'Solo se escribe en la consola al configurar el agente; se revoca después'],
  ], [3, 5.5, 5]),
  p('Una variable secreta de Azure no llega sola a los scripts: cada paso la mapea con `env:` y Azure enmascara el valor en los registros. `devops/scripts/verify-secret.js` confirma que el secreto llegó **sin imprimir su valor**. Si un secreto se expone, el procedimiento es rotarlo de inmediato, actualizar las fuentes, revocar el valor expuesto (borrar el commit no basta) y registrar un Work Item.'),
  h2('9.6 Controles automáticos'),
  table('Controles automáticos de seguridad', ['Control', 'Dónde', 'Qué evita'], [
    ['`check-secrets.js`', 'Azure Pipelines y GitHub Actions', 'Claves privadas, tokens de GitHub, claves AWS, PAT de Azure DevOps, credenciales en URL y asignaciones literales de password/token. Reporta archivo y línea, nunca el valor'],
    ['`tests/secrets.test.js`', 'Ambos CI', 'Verifica las reglas del escáner con valores falsos armados en tiempo de ejecución'],
    ['`permissions.test.js`, `access.test.js`', 'Ambos CI', 'Matriz de permisos por rol: visibilidad, 403 y 404'],
    ['`auth.test.js`, `auth-routes.test.js`', 'Ambos CI', 'Hash, tokens y login sin enumeración de usuarios'],
    ['`npm audit --audit-level=high`', 'Ambos CI', 'Publicar con dependencias vulnerables'],
    ['`docker-compose.yml`', 'Local', '`DB_PASSWORD` obligatoria (`:?`): no hay contraseña por defecto'],
  ], [4, 3, 6]),
  note('Alcance del escáner', 'El escáner de secretos es un control propio y sencillo: revisa los archivos versionados actuales, no el historial de Git, y no sustituye a una herramienta dedicada como gitleaks.', 'warn'),

  // ============================================================ 10 DEVOPS
  h1('10. DevOps y gestión del ciclo de vida'),
  h2('10.1 Trazabilidad de extremo a extremo'),
  p('El proceso exige que cada cambio pueda seguirse desde su requerimiento hasta el entorno donde corre: **Work Item (AB#ID) → rama → commit con AB#ID → Pull Request → corrida de pipeline → artefacto → versión (tag) → release por ambiente.**'),
  img('06-cicd.png', 'Flujo de integración y entrega continua', 620),
  h2('10.2 Gestión del trabajo en Azure Boards'),
  p('El backlog se gestiona con el proceso **Agile** de Azure Boards, con estimaciones en horas (Tasks) y puntos (Stories) y roles asignados mediante etiquetas.'),
  table('Composición del backlog', ['Tipo de elemento', 'Cantidad', 'Ejemplos'], [
    ['Epic', '2', 'Plataforma de gestión de incidentes · Entrega continua DevOps'],
    ['Feature', '5', 'Registro y consulta · Operación, seguimiento e indicadores · Pipeline CI · Seguridad y lanzamiento · Autenticación y roles (AB#375)'],
    ['User Story', '12', 'Crear incidente · Consultar y filtrar · Asignar y cambiar estado · Comentarios y bitácora · Dashboard · Pipeline CI · Seguridad · Versionado y release · Deuda técnica'],
    ['Task', '40', 'Modelo de datos · Endpoints · UI · Pipeline · Secretos · Ambientes · Login y roles · Pruebas'],
    ['Bug', '3', 'AB#358 orden del listado · AB#371 ZIP de builds anteriores · AB#374 vulnerabilidad en body-parser'],
  ], [3, 2, 8], true),
  p('La exportación completa de los 62 elementos está en `docs/evidencia/backlog-azure-boards.csv`.'),
  h2('10.3 Estrategia de ramas y Pull Requests'),
  img('07-ramas.png', 'Estrategia de ramas y versionado', 620),
  table('Reglas de trabajo con Git', ['Elemento', 'Regla'], [
    ['`main`', 'Siempre estable; solo recibe cambios mediante Pull Request con revisión y pipeline en verde'],
    ['Ramas de trabajo', '`feature/<AB#ID>-descripcion`, `fix/<AB#ID>-descripcion`, `refactor/<AB#ID>-descripcion`'],
    ['Rama de integración', '`feature/login-roles` agrupó las tres piezas interdependientes de la v1.1.0 antes de llegar a `main`'],
    ['Commits', 'Mensaje convencional con el Work Item, por ejemplo `feat: crear incidente AB#12`'],
    ['Pull Request', 'Descripción, Work Item vinculado, comentario con la evidencia de la corrida y voto de aprobación'],
    ['Fusión', 'Merge commit (`noFastForward`) para conservar la autoría de cada integrante; las ramas no se borran'],
  ], [3, 9], true),
  p('Hasta la fecha se han abierto 32 Pull Requests en Azure Repos (`docs/evidencia/pull-requests.csv`). **Limitación:** al ser un proyecto individual, la misma identidad de Azure DevOps aprueba y fusiona; no existe un revisor independiente.'),
  h2('10.4 Integración continua'),
  table('Etapas del pipeline `incident-hub-ci` (Azure Pipelines, agente autohospedado)', ['Paso', 'Acción', 'Falla si…'], [
    ['1', 'Checkout e instalación de Node 22 (`UseNode@1`)', 'No se puede preparar el entorno'],
    ['2', 'Escáner de secretos y pruebas de utilidades DevOps (27)', 'Se detecta un secreto o falla una prueba'],
    ['3', 'Verificación del secreto `DB_PASSWORD` del variable group', 'El secreto no llega al paso'],
    ['4', 'Backend: `npm ci`, build y pruebas (108), publicación de resultados', 'Falla una prueba'],
    ['5', 'Backend: `npm audit --audit-level=high`', 'Hay vulnerabilidades high o critical'],
    ['6', 'Frontend: `npm ci`, build, pruebas (67) y auditoría', 'Falla build, prueba o auditoría'],
    ['7', 'Empaquetado de backend y frontend (ZIP) y publicación del artefacto `incident-hub`', 'No se generó el paquete'],
  ], [0.9, 7.5, 4.6]),
  p('**GitHub Actions** (`.github/workflows/ci.yml`) ejecuta de forma complementaria, en cada push y Pull Request a GitHub, tres trabajos: escáner de secretos con pruebas de utilidades, pruebas y auditoría del backend, y pruebas, build y auditoría del frontend. La verificación del secreto `DB_PASSWORD` se hace solo en pushes a `main`, porque los secretos no se entregan a Pull Requests de forks.'),
  p('El agente autohospedado `agente-local-01` (pool `Default`) es una máquina local; su instalación y registro con un PAT se describen en `devops/README.md`. Al ser un único agente, las corridas se encolan.'),
  h2('10.5 Fallos controlados del pipeline'),
  p('Se provocaron y documentaron fallos reales para demostrar que los controles actúan y que el equipo sabe diagnosticarlos (detalle en `docs/ci-failure-diagnosis.md`).'),
  table('Fallos del pipeline, causa y corrección', ['Corrida', 'Fallo', 'Causa raíz', 'Corrección'], [
    ['#6', 'Prueba de orden del listado', 'Regresión introducida a propósito: `ORDEN_LISTADO` ascendente', 'Bug AB#358: orden descendente por fecha e id; corrida #7 en verde'],
    ['#34', 'Despliegue a dev', 'La carpeta del artefacto conservaba ZIP de corridas anteriores (hallaba 2)', 'Bug AB#371: usar el ZIP exacto de la build (PR #22)'],
    ['#38, #39', 'Revisión de dependencias', 'Aviso nuevo de `body-parser` < 1.20.9 (GHSA-27r3-jxmh-p828, alta)', 'Bug AB#374: `npm audit fix` actualiza a 1.20.9 (PR #25); corrida #40 en verde'],
    ['#48', 'Escáner de secretos', 'Pruebas del frontend con literales con forma de token y contraseña', 'Valores armados en tiempo de ejecución; corrida #50 en verde'],
  ], [1.4, 3, 5, 4.6]),
  h2('10.6 Entrega por ambientes y release'),
  table('Ambientes', ['Ambiente', 'Environment en Azure', 'Disparo', 'Control'], [
    ['dev', '`incident-hub-dev`', 'Automático tras CI verde en `main`', 'Validación posterior con `deploy.js estado`'],
    ['staging', '`incident-hub-staging`', 'Tras un dev correcto', '**Aprobación manual** (check *Approval*)'],
    ['prod', '`incident-hub-prod`', 'Tras un staging correcto', '**Aprobación manual** (check *Approval*)'],
  ], [1.6, 3.4, 4.2, 4.3], true),
  ul(
    'Solo la rama `main` ejecuta los *stages* de despliegue; las ramas de trabajo ejecutan únicamente el CI.',
    'Cada despliegue deja un release versionado en `_work/deploy/<ambiente>/<versión>-b<build>/` con `backend/`, `frontend/` y `release.json` (versión, build, commit y fecha). `current.json` apunta al release vigente y al anterior.',
    'El mismo artefacto se promueve entre ambientes: se prueba una vez y se despliega lo mismo.',
    'La corrida final de `main` (20261026.5) fue aprobada por el responsable del proyecto y completó dev → staging → producción en verde.',
  ),
  p('**Rollback** sin recompilar: intercambia el release vigente por el anterior y se puede revertir a su vez.'),
  code(`node devops/scripts/deploy.js rollback --entorno <dev|staging|prod> --raiz <agente>/_work/deploy
node devops/scripts/deploy.js estado   --entorno <dev|staging|prod> --raiz <agente>/_work/deploy`),
  table('Lista de verificación de un release', ['Paso', 'Verificación'], [
    ['1', 'Pull Requests del hito fusionados y Work Items cerrados'],
    ['2', 'Pipeline de `main` y GitHub Actions en verde'],
    ['3', '`npm audit` sin high/critical, o decisión registrada en `docs/dependencies.md`'],
    ['4', 'Deudas nuevas registradas en `docs/technical-debt.md`'],
    ['5', 'Despliegue en dev validado'],
    ['6', 'Aprobación a staging y pruebas manuales de humo'],
    ['7', 'Aprobación a producción y validación posterior'],
    ['8', 'Tag anotado `vX.Y.Z` y notas en `CHANGELOG.md`'],
  ], [1.2, 11.5]),
  note('Alcance real', 'Al ser un proyecto individual, quien aprueba es la misma persona que ejecuta el pipeline; la aprobación queda registrada con fecha en el historial de la corrida. Está pendiente reforzar los ambientes con el check *Branch control* (solo `main`).', 'warn'),
  h2('10.7 Versionado semántico'),
  p('Backend y frontend comparten versión. Las versiones siguen **SemVer**: cambios incompatibles en MAJOR, funcionalidad nueva en MINOR y correcciones en PATCH. Los tags `vX.Y.Z` son anotados y apuntan al commit de `main` que cierra cada hito; una prueba automática verifica la coherencia de versiones entre paquetes y `CHANGELOG.md`.'),
  table('Versiones publicadas', ['Versión', 'Fecha', 'Hito'], [
    ['v0.1.0', '2026-10-17', 'Estructura, backlog, modelo de datos y API de incidentes con filtros'],
    ['v0.2.0 / v0.2.1', '2026-10-17', 'CI en Azure y GitHub; corrección con fallo controlado (Bug AB#358)'],
    ['v0.3.0', '2026-10-17', 'Frontend: lista y filtros'],
    ['v0.4.0', '2026-10-17', 'Asignación, transiciones de estado y bitácora'],
    ['v0.5.0', '2026-10-18', 'Funcionalidad completa: dashboard, historial, formulario de alta'],
    ['v0.6.0', '2026-10-18', 'Deuda técnica: D1 y D2 resueltas'],
    ['v0.7.0', '2026-10-18', 'Secretos protegidos y escáner'],
    ['v0.8.0', '2026-10-18', 'Ambientes y aprobaciones'],
    ['v0.9.0 / v0.9.1', '2026-10-20', 'Versionado unificado; corrección del despliegue (Bug AB#371)'],
    ['**v1.0.0**', '2026-10-24', 'Primera versión estable'],
    ['**v1.1.0**', '2026-10-25', 'Inicio de sesión con roles y asignación automática por categoría'],
  ], [2.4, 2.2, 8.4]),
  h2('10.8 Análisis de dependencias'),
  table('Hallazgos de `npm audit`', ['Fecha', 'Componente', 'Hallazgo', 'Severidad', 'Decisión'], [
    ['2026-10-17', 'frontend (dev)', 'vite 5: path traversal y NTLMv2 vía launch-editor', 'high', 'Corregida: vite 8'],
    ['2026-10-17', 'frontend (dev)', 'vitest 2 / tinypool: prototype pollution a RCE', 'critical', 'Corregida: vitest 5'],
    ['2026-10-17', 'frontend (dev)', 'esbuild y transitivas de vite', 'moderate', 'Corregida con vite 8 y vitest 5'],
    ['2026-10-24', 'backend (producción)', 'body-parser 1.20.8: denegación de servicio (GHSA-27r3-jxmh-p828)', 'high', 'Corregida: 1.20.9 (Bug AB#374)'],
  ], [1.8, 2.4, 5, 1.5, 3]),
  p('Estado actual: `npm audit` reporta **0 vulnerabilidades** en backend y frontend. Los avisos aparecen con el tiempo, por eso el análisis se ejecuta en cada corrida y no solo al instalar; el aviso de `body-parser` apareció después de varias corridas en verde y detuvo el pipeline, tal como se diseñó.'),

  // ============================================================ 11 CALIDAD
  h1('11. Aseguramiento de la calidad'),
  h2('11.1 Estrategia de pruebas'),
  table('Niveles y herramientas de prueba', ['Nivel', 'Herramienta', 'Qué cubre', 'Pruebas'], [
    ['API y reglas', '`node --test` + supertest + pg-mem', 'Rutas, validaciones, transiciones, bitácora, indicadores, tokens, login, matriz de permisos y asignación automática', '108'],
    ['Interfaz', 'Vitest + Testing Library', 'Componentes, filtros, formularios, login, sesión y expiración, permisos por rol y errores', '67'],
    ['DevOps', '`node --test`', 'Escáner de secretos, despliegue y rollback, coherencia de versiones', '27'],
    ['Integración continua', 'Azure Pipelines y GitHub Actions', 'Todo lo anterior más `npm audit`', '202 + auditoría'],
  ], [2.4, 3.4, 5.8, 1.4], true),
  note('Límite conocido (D4)', 'pg-mem simula PostgreSQL en memoria pero no reproduce todo su comportamiento (por ejemplo, `ROLLBACK` no revierte), por lo que no se prueban transacciones. Las instrucciones de Docker con PostgreSQL real no se han verificado de punta a punta.', 'warn'),
  h2('11.2 Plan de pruebas de aceptación'),
  p('Los casos siguientes validan los requerimientos desde la perspectiva del usuario. La columna **Cobertura automática** indica qué suite los ejercita; el caso CP-02 se ejecutó además de forma manual en la demostración local.'),
  table('Casos de prueba de aceptación', ['ID', 'Escenario y pasos', 'Resultado esperado', 'Cobertura automática'], [
    ['CP-01', 'Iniciar sesión con credenciales válidas', 'Se muestra la lista de incidentes del alcance del rol', '`auth-routes`, `Login`'],
    ['CP-02', 'Como Ana (solicitante), crear un incidente de Telecomunicaciones', 'Mensaje «creado y asignado automáticamente a Carlos Teleco»; estado ASIGNADO', '`auto-assign`, `IncidentForm`'],
    ['CP-03', 'Iniciar sesión con contraseña errónea', 'Mensaje de credenciales inválidas; sin sesión', '`auth-routes`, `Login`'],
    ['CP-04', 'Como Luis (técnico de cómputo), abrir el incidente de telecomunicaciones', 'No aparece en su lista; el acceso directo devuelve 404', '`permissions`, `access`'],
    ['CP-05', 'Como Carlos, cambiar el estado a EN_PROCESO y comentar', 'Estado actualizado y dos eventos en la bitácora', '`incident-actions`, `incident-history`'],
    ['CP-06', 'Como Ana, intentar cambiar un estado (llamada directa a la API)', '403 sin permiso', '`permissions`'],
    ['CP-07', 'Como administrador, reasignar a un técnico que no atiende la categoría', '400 «el técnico no atiende la categoría»', '`incident-actions`'],
    ['CP-08', 'Avanzar de ASIGNADO a CERRADO', '409 con los estados permitidos', '`workflow`, `incident-actions`'],
    ['CP-09', 'Crear un incidente de «Otros»', 'Queda NUEVO sin técnico hasta que el administrador lo asigne', '`auto-assign`'],
    ['CP-10', 'Filtrar por estado y prioridad a la vez', 'Solo incidentes que cumplen ambos', '`incident-filters`, `IncidentList`'],
    ['CP-11', 'Abrir el dashboard como técnico', 'Indicadores limitados a sus categorías', '`stats`, `Dashboard`'],
    ['CP-12', 'Token expirado durante el uso', 'La aplicación vuelve al login', '`api`, `App`'],
  ], [1.1, 5.2, 4.7, 3], true),
  h2('11.3 Resultados y métricas'),
  table('Indicadores de calidad', ['Indicador', 'Valor'], [
    ['Pruebas automáticas', '202 (backend 108, frontend 67, DevOps 27), todas en verde'],
    ['Vulnerabilidades (`npm audit`)', '0 en backend y en frontend'],
    ['Escáner de secretos', 'Sin hallazgos en archivos versionados'],
    ['Corridas de Azure Pipelines', 'Más de 50; fallos controlados y corregidos: #6, #34, #38, #39 y #48'],
    ['Corridas de GitHub Actions', '20 registradas, incluida una disparada por un Pull Request de GitHub'],
    ['Deuda técnica', '11 identificadas, 3 resueltas (D1, D2, D5)'],
  ], [4.6, 8]),

  // ============================================================ 12 INSTALACION
  h1('12. Manual de instalación y operación'),
  h2('12.1 Requisitos'),
  table('Requisitos previos', ['Componente', 'Versión', 'Uso'], [
    ['Node.js y npm', '22 (o 20.19+)', 'Backend, frontend y pruebas'],
    ['Git', 'Reciente', 'Clonar el repositorio'],
    ['Docker Desktop', 'Reciente', 'Solo para PostgreSQL local (no necesario en el modo demostración)'],
    ['PowerShell', '5.1 o superior', 'Los comandos de esta guía'],
  ], [3.4, 3, 6.4]),
  h2('12.2 Instalación con PostgreSQL (Docker)'),
  ol('num1',
    '**Clonar e instalar dependencias:** `git clone https://github.com/SotoJ08/incident-hub.git`, luego `npm ci` dentro de `backend` y de `frontend`.',
    '**Levantar la base de datos:** definir una contraseña local en `$env:DB_PASSWORD` (no se guarda en el repositorio) y ejecutar `docker compose up -d db`.',
    '**Migrar y cargar datos de ejemplo:** definir `DATABASE_URL`, ejecutar `npm run migrate` en `backend` y aplicar `database/seed.sql` con `psql`.',
    '**Iniciar la API (puerto 3000):** `npm start` en `backend`; comprobar `http://localhost:3000/health`.',
    '**Iniciar la interfaz (puerto 5173):** `npm run dev` en `frontend`; abrir `http://localhost:5173`.',
  ),
  code(`$env:DB_PASSWORD = "<su-contraseña-local>"
docker compose up -d db
$env:DATABASE_URL = "postgres://incident:$($env:DB_PASSWORD)@localhost:5432/incident_hub"
cd backend; npm run migrate; cd ..
Get-Content database/seed.sql | docker compose exec -T db psql -U incident -d incident_hub
cd backend; npm start            # terminal 1
cd frontend; npm run dev         # terminal 2`),
  h2('12.3 Modo demostración sin Docker'),
  p('El paquete de entrega incluye `LOCAL-DEMO/`, un servidor que usa la **misma API y la misma interfaz** con una base de datos en memoria precargada con siete incidentes de ejemplo coherentes con los roles. Solo requiere Node.js.'),
  code(`cd incident-hub
.\\LOCAL-DEMO\\start-demo.ps1
# o manualmente, en dos terminales:
node LOCAL-DEMO/dev-memory.js          # API en :3000
cd frontend; npm run dev                # interfaz en :5173`),
  p('Los cambios se pierden al detener la demostración. Los usuarios y la contraseña de prueba están en el apartado 13.1.'),
  h2('12.4 Variables de entorno'),
  table('Variables de entorno', ['Variable', 'Obligatoria', 'Descripción'], [
    ['`DATABASE_URL`', 'Sí (backend)', 'Cadena de conexión a PostgreSQL'],
    ['`DB_PASSWORD`', 'Sí (Docker)', 'Contraseña de la base; `docker-compose.yml` no define valor por defecto'],
    ['`DB_USER`', 'No', 'Usuario de la base (por defecto `incident`)'],
    ['`PORT`', 'No', 'Puerto de la API (por defecto 3000)'],
    ['`AUTH_SECRET`', 'Sí con `NODE_ENV=production`', 'Secreto de firma de tokens; en desarrollo se genera uno aleatorio por proceso'],
    ['`NODE_ENV`', 'No', 'Con `production` se exige `AUTH_SECRET`'],
  ], [3.4, 3.4, 6], true),
  h2('12.5 Ejecución de pruebas y verificaciones'),
  code(`cd backend;  npm test                 # 108 pruebas de API (pg-mem)
cd frontend; npm test                 # 67 pruebas de interfaz
node --test "tests/*.test.js"         # 27 pruebas de utilidades DevOps (requiere el repositorio Git)
node devops/scripts/check-secrets.js  # escáner de secretos`),
  h2('12.6 Operación'),
  table('Tareas operativas frecuentes', ['Tarea', 'Procedimiento'], [
    ['Aplicar nuevas migraciones', '`npm run migrate` en `backend`; es idempotente y registra en `schema_migrations`'],
    ['Agregar un técnico o una especialidad', 'Insertar en `users` y `tecnico_categorias` (no hay pantalla de administración de usuarios todavía)'],
    ['Regenerar un hash de contraseña', '`node backend/scripts/hash-password.js "<contraseña>" <sal-hex>`'],
    ['Volver a la versión anterior', '`deploy.js rollback` (apartado 10.6)'],
    ['Rotar `AUTH_SECRET`', 'Cambiar el valor y reiniciar la API; invalida todas las sesiones'],
    ['Registrar el agente de Pipelines', 'Guía en `devops/README.md`; el PAT se escribe solo en la consola y se revoca después'],
  ], [4.4, 8.4], true),
  h2('12.7 Solución de problemas'),
  table('Problemas comunes', ['Síntoma', 'Causa probable y solución'], [
    ['El puerto 3000 o 5173 está en uso', 'Hay otra instancia en ejecución; ciérrela o reinicie el equipo'],
    ['`node` no se reconoce', 'Instale Node.js y abra una PowerShell nueva'],
    ['La pantalla de acceso no deja entrar', 'Compruebe que la API siga abierta (`/health` debe responder `{"status":"ok"}`); al reiniciar la API en desarrollo las sesiones se pierden'],
    ['`docker compose` indica que `DB_PASSWORD` es obligatoria', 'Defina `$env:DB_PASSWORD` en la misma terminal antes de ejecutar el comando'],
    ['Las pruebas de `tests/` fallan con «not a git repository»', 'Ejecútelas dentro de un clon del repositorio (o del bundle Git incluido en la entrega)'],
  ], [5, 8]),

  // ============================================================ 13 MANUAL DE USUARIO
  h1('13. Manual de usuario'),
  h2('13.1 Acceso al sistema'),
  p('Abra `http://localhost:5173` e ingrese con su correo y contraseña. La sesión dura 8 horas y se cierra con el botón «Cerrar sesión». Para la demostración existen estos usuarios, todos con la contraseña de prueba `IncidentHub#2026`:'),
  table('Usuarios de demostración', ['Correo', 'Rol', 'Qué ve y qué hace'], [
    ['`ana@example.com`, `pedro@example.com`', 'Solicitante', 'Crea incidentes y ve solo los suyos; puede comentar'],
    ['`luis@example.com`', 'Técnico', 'Atiende Equipo de cómputo'],
    ['`marta@example.com`', 'Técnico', 'Atiende Sistema Institucional y Gestión de Accesos'],
    ['`carlos@example.com`', 'Técnico', 'Atiende Telecomunicaciones (solo ve temas de telecomunicaciones)'],
    ['`admin@example.com`', 'Administrador', 'Ve todo, asigna y reasigna técnicos, cambia cualquier estado'],
  ], [4.6, 2.4, 6]),
  shot('01-login.jpg', 'Pantalla de inicio de sesión', 440),
  h2('13.2 Solicitante: reportar y seguir un incidente'),
  ol('num2',
    'Inicie sesión; verá «Sus incidentes», con la lista de los que reportó.',
    'Pulse **Nuevo incidente**, escriba el título y la descripción, elija la categoría y la prioridad, y pulse **Crear incidente**.',
    'El sistema confirma el número de incidente y, si hay técnico para esa categoría, le informa a quién se asignó automáticamente.',
    'Use **Ver** para abrir el detalle, leer la bitácora y agregar comentarios mientras el incidente no esté cerrado.',
    'Use los filtros (estado, prioridad, categoría, técnico) para encontrar un incidente.',
  ),
  shot('02-ana-lista.jpg', 'Lista de incidentes de un solicitante', 440),
  shot('04-asignacion-automatica-carlos.jpg', 'Incidente de Telecomunicaciones creado y asignado automáticamente', 440),
  h2('13.3 Técnico: atender incidentes'),
  ol('num3',
    'Inicie sesión: verá los incidentes de las categorías que atiende (el técnico de telecomunicaciones solo ve esa categoría).',
    'Abra un incidente asignado a usted con **Ver**.',
    'Cambie el estado siguiendo el flujo: ASIGNADO → EN_PROCESO → RESUELTO → CERRADO. Si el usuario reporta que el problema persiste, puede reabrir un incidente RESUELTO a EN_PROCESO.',
    'Documente cada avance con un comentario; queda en la bitácora con su nombre y la fecha.',
  ),
  note('Qué no puede hacer un técnico', 'No puede asignar ni reasignar técnicos, ni cambiar el estado de incidentes asignados a otro técnico. La interfaz oculta esas acciones y el servidor las rechaza con 403 si se intentan.', 'info'),
  shot('05-carlos-lista.jpg', 'Vista del técnico de telecomunicaciones', 440),
  h2('13.4 Administrador: asignar y supervisar'),
  ol('num4',
    'Inicie sesión: verá todos los incidentes. Los de la categoría «Otros» quedan NUEVO hasta que usted los asigne.',
    'En el detalle de un incidente elija un técnico de la lista (solo aparecen los que atienden esa categoría) y confirme la asignación o reasignación.',
    'Cambie cualquier estado cuando sea necesario.',
    'Abra **Dashboard** para ver los totales, los incidentes críticos, los no asignados y la distribución por estado, categoría y técnico.',
  ),
  shot('06-admin-dashboard.jpg', 'Dashboard del administrador', 440),
  shot('07-admin-detalle.jpg', 'Detalle de un incidente con asignación y bitácora', 440),
  h2('13.5 Mensajes de la interfaz'),
  table('Mensajes frecuentes', ['Mensaje', 'Significado y acción'], [
    ['Credenciales inválidas', 'Correo o contraseña incorrectos; verifique e intente de nuevo'],
    ['La sesión expiró', 'Vuelva a iniciar sesión'],
    ['Transición inválida', 'El estado elegido no es el siguiente en el flujo; use uno de los permitidos'],
    ['El incidente debe tener un técnico asignado', 'Pida a un administrador que asigne un técnico antes de cambiar el estado'],
    ['El técnico no atiende la categoría', 'Elija un técnico de la especialidad del incidente'],
  ], [4.4, 8.4]),

  // ============================================================ 14 TRAZABILIDAD
  h1('14. Matriz de trazabilidad'),
  p('La matriz relaciona cada requerimiento con su caso de uso, los componentes que lo implementan y las pruebas automáticas que lo verifican. Permite comprobar que no hay requerimientos sin implementar ni código sin justificación.'),
  table('Trazabilidad requerimiento → diseño → prueba', ['Requerimiento', 'CU', 'Componentes', 'Pruebas'], [
    ['RF-01, RF-02', 'CU-01', '`routes/auth.js`, `auth.js`, `middleware/auth.js`, `Login`, `session.js`, `api.js`', '`auth.test`, `auth-routes.test`, `Login.test`, `App.test`, `api.test`'],
    ['RF-03', 'CU-02', '`routes/incidents.js`, `IncidentForm`', '`incidents.test`, `IncidentForm.test`'],
    ['RF-04', 'CU-09', '`assignment.js`', '`auto-assign.test`'],
    ['RF-05, RF-06', 'CU-03', '`routes/incidents.js`, `access.js`, `IncidentList`, `Filters`', '`incidents.test`, `incident-filters.test`, `IncidentList.test`'],
    ['RF-07', 'CU-04', '`routes/incidents.js`, `IncidentDetail`', '`incidents.test`, `IncidentDetail.test`'],
    ['RF-08', 'CU-07', '`routes/incident-actions.js`, `access.js`, `IncidentDetail`', '`incident-actions.test`, `permissions.test`'],
    ['RF-09', 'CU-06', '`routes/incident-actions.js`, `workflow.js`', '`incident-actions.test`, `workflow.test`'],
    ['RF-10, RF-11', 'CU-05, CU-04', '`routes/incident-history.js`, `IncidentHistory`', '`incident-history.test`, `IncidentHistory.test`'],
    ['RF-12', 'CU-08', '`routes/stats.js`, `Dashboard`', '`stats.test`, `Dashboard.test`'],
    ['RF-13', 'CU-02, CU-07', '`routes/catalogs.js`', '`catalogs.test`'],
    ['RF-14', 'CU-06', '`routes/workflow-route.js`, `workflow.js`', '`workflow-route.test`, `workflow.test`'],
    ['RNF-01, RNF-02', '-', '`auth.js`, `access.js`, `middleware/auth.js`', '`auth.test`, `access.test`, `permissions.test`, `permissions.test` (frontend)'],
    ['RNF-03', '-', '`database/migrations`', '`schema.test`'],
    ['RNF-09, RNF-11', '-', '`check-secrets.js`, pipelines', '`tests/secrets.test`, auditoría en CI'],
    ['RNF-10', '-', '`deploy.js`, `azure-pipelines.yml`', '`tests/deploy.test`'],
  ], [2.2, 1.5, 5.3, 4.8], true),

  // ============================================================ 15 RIESGOS
  h1('15. Riesgos, deuda técnica y limitaciones'),
  h2('15.1 Registro de deuda técnica'),
  p('La deuda se registró con Work Items etiquetados `deuda-tecnica` (hijos de la User Story AB#360). La meta del proyecto era identificar al menos cinco y resolver al menos dos con trabajo trazable; se identificaron 11 y se resolvieron 3.'),
  table('Deuda técnica', ['ID', 'Deuda', 'Impacto', 'Estado', 'Evidencia'], [
    ['D1', '`NodeTool@0` deprecado en el pipeline', 'Medio', '**Resuelta**', 'AB#361, PR #15'],
    ['D2', 'Reglas de transición duplicadas en frontend y backend', 'Medio', '**Resuelta**', 'AB#362, PR #16'],
    ['D3', 'Actualización del incidente y evento de bitácora sin transacción', 'Alto', 'Abierta', 'AB#363'],
    ['D4', 'Pruebas con pg-mem en vez de PostgreSQL real', 'Alto', 'Abierta', 'AB#364'],
    ['D5', 'Sin autenticación: el cliente enviaba `autor_id` y `solicitante_id`', 'Alto (seguridad)', '**Resuelta**', 'AB#365, v1.1.0'],
    ['D6', 'Sin lint en backend ni frontend', 'Bajo', 'Abierta', 'AB#366'],
    ['D7', '`GET /api/incidents` sin paginación', 'Medio', 'Abierta', 'AB#367'],
    ['D8', 'El pipeline de Azure no valida los PR automáticamente', 'Medio', 'Abierta', 'AB#368'],
    ['D9', 'El filtro por categoría no incluye subcategorías', 'Bajo', 'Abierta', 'AB#369'],
    ['D10', 'Sin límite de intentos de login ni bloqueo de cuentas', 'Medio (seguridad)', 'Abierta', 'Pendiente de registrar'],
    ['D11', 'Tokens sin revocación y guardados en `sessionStorage`', 'Medio (seguridad)', 'Abierta', 'Pendiente de registrar'],
  ], [0.9, 6.3, 2.3, 1.7, 2.4], true),
  p('**Por qué no se resolvieron ahora:** D3 y D4 van juntas, porque resolver D3 correctamente exige una transacción y D4 impide probarla con pg-mem; la salida es ejecutar las pruebas contra PostgreSQL real y luego envolver las escrituras en una transacción. D10 y D11 son las siguientes mejoras naturales de seguridad. D6 a D9 son mejoras acotadas para versiones posteriores.'),
  h2('15.2 Riesgos del proyecto'),
  table('Riesgos y mitigación', ['Riesgo', 'Probabilidad', 'Impacto', 'Mitigación'], [
    ['Agente autohospedado no disponible detiene los pipelines', 'Media', 'Alto', 'Guía de registro del agente en `devops/README.md`; las pruebas también corren en GitHub Actions'],
    ['Aviso de seguridad nuevo rompe el pipeline', 'Media', 'Medio', 'Gate de `npm audit` que obliga a decidir; ya ocurrió y se resolvió (AB#374)'],
    ['Comportamiento de PostgreSQL no cubierto por las pruebas', 'Media', 'Alto', 'Registrado como D4; plan de pruebas con PostgreSQL real'],
    ['Exposición de un secreto', 'Baja', 'Alto', 'Escáner en cada corrida; procedimiento de rotación'],
    ['Fuerza bruta contra el login', 'Media', 'Medio', 'Pendiente (D10); desplegar tras HTTPS y con límite de intentos'],
  ], [4.8, 1.8, 1.6, 5]),
  h2('15.3 Limitaciones conocidas'),
  ul(
    '**Revisión de Pull Requests:** la misma identidad aprueba y fusiona; no hay revisor independiente.',
    '**Equipo simulado:** la distribución de commits por cuenta es desigual y los primeros commits se hicieron con una sola cuenta; el historial no se reescribió.',
    '**Despliegue local:** los ambientes son carpetas sobre el agente autohospedado, no servidores externos.',
    '**Docker/PostgreSQL real:** las instrucciones de instalación con Docker no se probaron de punta a punta (Docker estaba apagado durante la verificación); sí está verificado el modo demostración.',
    '**Aprobaciones de staging y producción:** son manuales; solo se aprobó la corrida final de `main` y las corridas intermedias antiguas permanecen sin aprobar a propósito.',
    '**Azure Boards:** el acceso de invitados externos está desactivado en la organización universitaria, por lo que los Work Items quedan asignados a la única cuenta de Azure y los roles se indican con etiquetas.',
  ),
  h2('15.4 Trabajo futuro'),
  ol('num5',
    'Ejecutar las pruebas contra PostgreSQL real y envolver las escrituras en transacciones (D4, D3).',
    'Límite de intentos de login, cookies `HttpOnly` y revocación de tokens (D10, D11).',
    'Paginación del listado y búsqueda de texto (D7).',
    'Política de rama en Azure Repos con validación automática de Pull Requests (D8) y lint en ambos paquetes (D6).',
    'Pantalla de administración de usuarios y especialidades, y notificaciones por correo.',
    'Despliegue en un servidor real con HTTPS y el check *Branch control* en los ambientes.',
  ),

  // ============================================================ 16 GESTION
  h1('16. Gestión del proyecto'),
  h2('16.1 Cronograma de hitos'),
  table('Hitos del proyecto', ['Fecha', 'Hito'], [
    ['2026-10-17', 'Repositorios y backlog creados; v0.1.0 a v0.4.0 (modelo de datos, API, CI, frontend, operación)'],
    ['2026-10-18', 'v0.5.0 a v0.8.0: funcionalidad completa, deuda técnica, secretos y ambientes con aprobaciones'],
    ['2026-10-20', 'v0.9.0 y v0.9.1: versionado unificado y corrección del despliegue; creación de los tags'],
    ['2026-10-24', '**v1.0.0**: primera versión estable'],
    ['2026-10-25', '**v1.1.0**: inicio de sesión con roles y asignación automática; evidencia y paquete de entrega'],
    ['2026-10-26', 'Documento de análisis, diseño y operación (este documento)'],
  ], [2.4, 10.4]),
  h2('16.2 Contribuciones por integrante'),
  table('Commits en `main` atribuidos a cada cuenta de GitHub', ['Cuenta', 'Commits', 'Responsabilidad'], [
    ['SotoJ08', '32', 'Backend, DevOps, documentación'],
    ['Edd210', '11', 'Pruebas, seguridad y permisos'],
    ['DharaGar29', '3', 'Frontend'],
  ], [4, 2.4, 6.4]),
  p('Los datos provienen de `docs/evidencia/contribuciones.txt`. La distribución es desigual y se reporta tal cual.'),
  h2('16.3 Evidencias disponibles'),
  table('Índice de evidencias', ['Evidencia', 'Ubicación'], [
    ['Backlog completo (62 elementos)', '`docs/evidencia/backlog-azure-boards.csv`'],
    ['Pull Requests y sus validaciones', '`docs/evidencia/pull-requests.csv`'],
    ['Corridas de Azure Pipelines', '`docs/evidencia/pipeline-runs.csv`'],
    ['Corridas de GitHub Actions', '`docs/evidencia/github-actions-runs.csv`'],
    ['Historial de Git, ramas y tags', '`docs/evidencia/historial-git.csv`, `ramas.txt`, `tags.txt`, y el bundle `incident-hub.git.bundle`'],
    ['Autoría por cuenta', '`docs/evidencia/contribuciones.txt`'],
    ['Cumplimiento contra el enunciado', '`docs/entrega.md`'],
    ['Diagnóstico de fallos del pipeline', '`docs/ci-failure-diagnosis.md`'],
  ], [5.4, 7.4], true),
  h2('16.4 Conclusiones'),
  p('IT Incident Hub cumple el alcance funcional definido y demuestra un ciclo DevOps trazable de punta a punta: cada cambio nace en un Work Item, avanza por rama y Pull Request, pasa un pipeline con pruebas, escáner de secretos y análisis de dependencias, se versiona con SemVer y se promueve por ambientes con aprobaciones. La seguridad se aplica en el servidor y está cubierta por pruebas. Las limitaciones restantes (transacciones y pruebas con PostgreSQL real, protección contra fuerza bruta, despliegue en un servidor externo y revisión independiente de los Pull Requests) están identificadas, justificadas y registradas como deuda técnica.'),
];
