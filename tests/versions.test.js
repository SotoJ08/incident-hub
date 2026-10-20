const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const leer = (...p) => fs.readFileSync(path.join(raiz, ...p), 'utf8');
const SEMVER = /^\d+\.\d+\.\d+$/;
const cmp = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

const backend = JSON.parse(leer('backend', 'package.json')).version;
const frontend = JSON.parse(leer('frontend', 'package.json')).version;
const changelog = leer('CHANGELOG.md');
const versiones = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/gm)].map((m) => ({ version: m[1], fecha: m[2] }));

test('backend y frontend declaran una version SemVer valida y la misma', () => {
  assert.match(backend, SEMVER);
  assert.match(frontend, SEMVER);
  assert.strictEqual(frontend, backend);
});

test('el CHANGELOG tiene entradas y la mas reciente coincide con la version actual', () => {
  assert.ok(versiones.length >= 2, 'el CHANGELOG debe listar varias versiones');
  assert.strictEqual(versiones[0].version, backend);
});

test('las versiones del CHANGELOG estan en orden descendente y sin repetir', () => {
  for (let i = 1; i < versiones.length; i++) {
    assert.ok(cmp(versiones[i - 1].version, versiones[i].version) > 0, `${versiones[i - 1].version} debe ser mayor que ${versiones[i].version}`);
  }
});

test('las fechas del CHANGELOG no decrecen hacia versiones nuevas', () => {
  for (let i = 1; i < versiones.length; i++) {
    assert.ok(versiones[i - 1].fecha >= versiones[i].fecha, `la fecha de ${versiones[i - 1].version} no puede ser anterior a la de ${versiones[i].version}`);
  }
});

test('cada version publicada referencia al menos un Work Item', () => {
  const bloques = changelog.split(/^## \[/m).slice(1).filter((b) => /^\d+\.\d+\.\d+\]/.test(b));
  for (const b of bloques) assert.match(b, /AB#\d+/, `la version ${b.slice(0, 5)} no cita ningun Work Item`);
});
