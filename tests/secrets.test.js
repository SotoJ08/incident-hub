const test = require('node:test');
const assert = require('node:assert');
const { scanContent, scanRepo } = require('../devops/scripts/check-secrets');
const { verificar } = require('../devops/scripts/verify-secret');

// Los valores "secretos" se arman en tiempo de ejecucion: ningun archivo versionado contiene uno literal.
const reglas = (texto) => scanContent(texto).map((h) => h.regla);

test('detecta una clave privada', () => {
  assert.deepStrictEqual(reglas('-----BEGIN ' + 'RSA PRIVATE KEY-----'), ['clave-privada']);
});

test('detecta tokens de GitHub y claves AWS', () => {
  assert.deepStrictEqual(reglas('x = ' + 'ghp_' + 'a'.repeat(36)), ['token-github']);
  assert.deepStrictEqual(reglas('k ' + 'AKIA' + 'B'.repeat(16)), ['clave-aws']);
});

test('detecta un PAT de Azure DevOps asignado a una variable', () => {
  assert.ok(reglas('AZURE_PAT=' + 'a2'.repeat(26)).includes('pat-azure-devops'));
});

test('detecta credenciales dentro de una URL', () => {
  assert.deepStrictEqual(reglas('postgres://admin:' + 'Sup3rClave' + '@db:5432/x'), ['credencial-en-url']);
});

test('detecta asignaciones literales de password', () => {
  assert.deepStrictEqual(reglas('const password = "' + 'abcdefgh1234' + '"'), ['asignacion-secreta']);
});

test('no marca marcadores de posicion ni variables de entorno', () => {
  assert.deepStrictEqual(scanContent('DATABASE_URL=postgres://incident:<DB_PASSWORD>@localhost:5432/incident_hub'), []);
  assert.deepStrictEqual(scanContent('POSTGRES_PASSWORD: ${DB_PASSWORD:?defina DB_PASSWORD}'), []);
  assert.deepStrictEqual(scanContent('DB_PASSWORD='), []);
  assert.deepStrictEqual(scanContent('env: { DB_PASSWORD: $(DB_PASSWORD) }'), []);
  assert.deepStrictEqual(scanContent('password: "${{ secrets.DB_PASSWORD }}"'), []);
});

test('el reporte indica archivo y linea pero jamas el valor encontrado', () => {
  const valor = 'ghp_' + 'z'.repeat(36);
  const hallazgos = scanContent('linea 1\nlinea 2 con ' + valor);
  assert.deepStrictEqual(hallazgos, [{ linea: 2, regla: 'token-github' }]);
  assert.ok(!JSON.stringify(hallazgos).includes(valor));
});

test('el repositorio versionado no contiene secretos', () => {
  const hallazgos = scanRepo(require('path').join(__dirname, '..'));
  assert.deepStrictEqual(hallazgos, []);
});

test('verificar acepta un secreto presente sin devolver su valor', () => {
  const r = verificar('DB_PASSWORD', { DB_PASSWORD: 'valor-cualquiera' });
  assert.deepStrictEqual(r, { ok: true });
});

test('verificar rechaza secretos vacios, ausentes o con macro de Azure sin resolver', () => {
  assert.strictEqual(verificar('DB_PASSWORD', {}).ok, false);
  assert.strictEqual(verificar('DB_PASSWORD', { DB_PASSWORD: '  ' }).ok, false);
  const sinResolver = verificar('DB_PASSWORD', { DB_PASSWORD: '$(DB_PASSWORD)' });
  assert.strictEqual(sinResolver.ok, false);
  assert.match(sinResolver.motivo, /variable group/);
});
