const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { prepararRelease, rollback, estado, verificarBackend, verificarFrontend, buscarZip } = require('../devops/scripts/deploy');

// Carpeta de artefactos como la deja un agente autohospedado: zips de varias builds conviviendo
function carpetaConZips(...builds) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zips-test-'));
  for (const b of builds) {
    fs.writeFileSync(path.join(dir, `incident-hub-backend-${b}.zip`), 'x');
    fs.writeFileSync(path.join(dir, `incident-hub-frontend-${b}.zip`), 'x');
  }
  return dir;
}

test('buscarZip elige el zip de la build actual aunque haya zips de builds anteriores (AB#371)', () => {
  const dir = carpetaConZips(32, 34);
  assert.strictEqual(path.basename(buscarZip(dir, 'incident-hub-backend', 34)), 'incident-hub-backend-34.zip');
  assert.strictEqual(path.basename(buscarZip(dir, 'incident-hub-frontend', '32')), 'incident-hub-frontend-32.zip');
});

test('buscarZip no confunde builds con el mismo prefijo numerico', () => {
  const dir = carpetaConZips(3, 34);
  assert.strictEqual(path.basename(buscarZip(dir, 'incident-hub-backend', 3)), 'incident-hub-backend-3.zip');
});

test('buscarZip informa que zips hay cuando falta el de la build y exige el numero de build', () => {
  const dir = carpetaConZips(32);
  assert.throws(() => buscarZip(dir, 'incident-hub-backend', 40), /no se encontro incident-hub-backend-40\.zip.*incident-hub-backend-32\.zip/);
  assert.throws(() => buscarZip(dir, 'incident-hub-backend'), /falta --build/);
  assert.throws(() => buscarZip(path.join(dir, 'no-existe'), 'incident-hub-backend', 1), /ningun zip/);
});

// Crea un "artefacto" ya extraido: backend y frontend minimos con la version indicada
function artefacto(version = '1.2.3') {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-test-'));
  const backendDir = path.join(base, 'backend');
  const frontendDir = path.join(base, 'frontend');
  fs.mkdirSync(path.join(backendDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(backendDir, 'src', 'server.js'), '// server');
  fs.writeFileSync(path.join(backendDir, 'package.json'), JSON.stringify({ name: 'b', version }));
  fs.mkdirSync(frontendDir);
  fs.writeFileSync(path.join(frontendDir, 'index.html'), '<div id="root"></div>');
  return { base, backendDir, frontendDir, raiz: path.join(base, 'deploy') };
}

const leer = (...p) => JSON.parse(fs.readFileSync(path.join(...p), 'utf8'));
const params = (a, extra = {}) => ({ backendDir: a.backendDir, frontendDir: a.frontendDir, raiz: a.raiz, entorno: 'dev', buildId: 10, commit: 'abc1234def', ...extra });

test('despliega un release con backend, frontend y manifiesto', () => {
  const a = artefacto();
  const m = prepararRelease(params(a, { ahora: new Date('2026-10-18T10:00:00Z') }));
  assert.strictEqual(m.release, '1.2.3-b10');
  const dir = path.join(a.raiz, 'dev', '1.2.3-b10');
  assert.ok(fs.existsSync(path.join(dir, 'backend', 'src', 'server.js')));
  assert.ok(fs.existsSync(path.join(dir, 'frontend', 'index.html')));
  assert.deepStrictEqual(leer(dir, 'release.json'), { entorno: 'dev', version: '1.2.3', build: '10', commit: 'abc1234def', release: '1.2.3-b10', fecha: '2026-10-18T10:00:00.000Z' });
});

test('current.json apunta al release nuevo y recuerda el anterior', () => {
  const a = artefacto();
  prepararRelease(params(a, { buildId: 10 }));
  assert.deepStrictEqual(leer(a.raiz, 'dev', 'current.json').actual, '1.2.3-b10');
  assert.strictEqual(leer(a.raiz, 'dev', 'current.json').anterior, null);
  prepararRelease(params(a, { buildId: 11 }));
  const c = leer(a.raiz, 'dev', 'current.json');
  assert.strictEqual(c.actual, '1.2.3-b11');
  assert.strictEqual(c.anterior, '1.2.3-b10');
});

test('los ambientes son independientes entre si', () => {
  const a = artefacto();
  prepararRelease(params(a, { entorno: 'dev', buildId: 10 }));
  prepararRelease(params(a, { entorno: 'staging', buildId: 10 }));
  assert.ok(fs.existsSync(path.join(a.raiz, 'dev', 'current.json')));
  assert.ok(fs.existsSync(path.join(a.raiz, 'staging', 'current.json')));
  assert.ok(!fs.existsSync(path.join(a.raiz, 'prod')));
});

test('no permite desplegar dos veces el mismo release en un ambiente', () => {
  const a = artefacto();
  prepararRelease(params(a));
  assert.throws(() => prepararRelease(params(a)), /ya esta desplegado/);
});

test('rechaza entornos desconocidos y artefactos incompletos', () => {
  const a = artefacto();
  assert.throws(() => prepararRelease(params(a, { entorno: 'qa' })), /entorno invalido/);
  fs.rmSync(path.join(a.backendDir, 'src', 'server.js'));
  assert.throws(() => verificarBackend(a.backendDir), /falta src\/server.js/);
  fs.writeFileSync(path.join(a.frontendDir, 'index.html'), '<html></html>');
  assert.throws(() => verificarFrontend(a.frontendDir), /contenedor root/);
});

test('un artefacto invalido no deja release a medias ni cambia current.json', () => {
  const a = artefacto();
  prepararRelease(params(a, { buildId: 10 }));
  fs.rmSync(path.join(a.frontendDir, 'index.html'));
  assert.throws(() => prepararRelease(params(a, { buildId: 11 })), /falta index.html/);
  assert.strictEqual(leer(a.raiz, 'dev', 'current.json').actual, '1.2.3-b10');
  assert.ok(!fs.existsSync(path.join(a.raiz, 'dev', '1.2.3-b11')));
});

test('rollback vuelve al release anterior y se puede revertir', () => {
  const a = artefacto();
  prepararRelease(params(a, { entorno: 'prod', buildId: 10 }));
  prepararRelease(params(a, { entorno: 'prod', buildId: 11 }));
  const r = rollback({ raiz: a.raiz, entorno: 'prod' });
  assert.deepStrictEqual([r.actual, r.anterior], ['1.2.3-b10', '1.2.3-b11']);
  const r2 = rollback({ raiz: a.raiz, entorno: 'prod' });
  assert.deepStrictEqual([r2.actual, r2.anterior], ['1.2.3-b11', '1.2.3-b10']);
});

test('estado devuelve el manifiesto del release vigente y sigue al rollback', () => {
  const a = artefacto();
  prepararRelease(params(a, { entorno: 'staging', buildId: 10 }));
  prepararRelease(params(a, { entorno: 'staging', buildId: 11 }));
  assert.strictEqual(estado({ raiz: a.raiz, entorno: 'staging' }).release, '1.2.3-b11');
  rollback({ raiz: a.raiz, entorno: 'staging' });
  assert.strictEqual(estado({ raiz: a.raiz, entorno: 'staging' }).release, '1.2.3-b10');
  assert.throws(() => estado({ raiz: a.raiz, entorno: 'prod' }), /no hay despliegues/);
});

test('rollback falla si no hay despliegues o release anterior', () => {
  const a = artefacto();
  assert.throws(() => rollback({ raiz: a.raiz, entorno: 'prod' }), /no hay despliegues/);
  prepararRelease(params(a, { entorno: 'prod' }));
  assert.throws(() => rollback({ raiz: a.raiz, entorno: 'prod' }), /no hay un release anterior/);
});
