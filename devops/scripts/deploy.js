#!/usr/bin/env node
// Despliegue por ambientes (AB#357): prepara un release versionado en <raiz>/<entorno>/<version>-b<build>
// y mantiene current.json (actual/anterior) para poder hacer rollback inmediato.
//
// Uso:
//   node devops/scripts/deploy.js desplegar --entorno dev --artefacto <dir> --raiz <dir> --build <n> --commit <sha>
//   node devops/scripts/deploy.js estado    --entorno dev  --raiz <dir>   (valida el release vigente)
//   node devops/scripts/deploy.js rollback  --entorno prod --raiz <dir>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ENTORNOS = ['dev', 'staging', 'prod'];

function exige(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function verificarBackend(dir) {
  exige(fs.existsSync(path.join(dir, 'src', 'server.js')), 'backend: falta src/server.js');
  exige(fs.existsSync(path.join(dir, 'package.json')), 'backend: falta package.json');
}

function verificarFrontend(dir) {
  const index = path.join(dir, 'index.html');
  exige(fs.existsSync(index), 'frontend: falta index.html');
  exige(/id="root"/.test(fs.readFileSync(index, 'utf8')), 'frontend: index.html no contiene el contenedor root');
}

const leerJson = (archivo) => JSON.parse(fs.readFileSync(archivo, 'utf8'));
const leerCurrent = (carpeta) => {
  const archivo = path.join(carpeta, 'current.json');
  return fs.existsSync(archivo) ? leerJson(archivo) : null;
};

// Copia backend y frontend ya extraidos a un release nuevo y lo marca como actual
function prepararRelease({ backendDir, frontendDir, raiz, entorno, buildId, commit, ahora = new Date() }) {
  exige(ENTORNOS.includes(entorno), `entorno invalido: ${entorno} (use ${ENTORNOS.join(', ')})`);
  exige(buildId, 'falta el numero de build');
  verificarBackend(backendDir);
  verificarFrontend(frontendDir);

  const version = leerJson(path.join(backendDir, 'package.json')).version;
  const nombre = `${version}-b${buildId}`;
  const carpetaEntorno = path.join(raiz, entorno);
  const destino = path.join(carpetaEntorno, nombre);
  exige(!fs.existsSync(destino), `el release ${nombre} ya esta desplegado en ${entorno}`);

  fs.mkdirSync(destino, { recursive: true });
  fs.cpSync(backendDir, path.join(destino, 'backend'), { recursive: true });
  fs.cpSync(frontendDir, path.join(destino, 'frontend'), { recursive: true });

  const manifiesto = { entorno, version, build: String(buildId), commit: commit || null, release: nombre, fecha: ahora.toISOString() };
  fs.writeFileSync(path.join(destino, 'release.json'), JSON.stringify(manifiesto, null, 2));

  const previo = leerCurrent(carpetaEntorno);
  fs.writeFileSync(
    path.join(carpetaEntorno, 'current.json'),
    JSON.stringify({ actual: nombre, anterior: previo ? previo.actual : null, actualizado: manifiesto.fecha }, null, 2)
  );
  return manifiesto;
}

// Intercambia actual y anterior: el release previo vuelve a ser el vigente
function rollback({ raiz, entorno, ahora = new Date() }) {
  exige(ENTORNOS.includes(entorno), `entorno invalido: ${entorno}`);
  const carpetaEntorno = path.join(raiz, entorno);
  const current = leerCurrent(carpetaEntorno);
  exige(current, `no hay despliegues en ${entorno}`);
  exige(current.anterior, `no hay un release anterior al cual volver en ${entorno}`);
  exige(fs.existsSync(path.join(carpetaEntorno, current.anterior)), `el release ${current.anterior} ya no existe`);
  const nuevo = { actual: current.anterior, anterior: current.actual, actualizado: ahora.toISOString() };
  fs.writeFileSync(path.join(carpetaEntorno, 'current.json'), JSON.stringify(nuevo, null, 2));
  return nuevo;
}

// Manifiesto del release vigente: sirve como validacion posterior al despliegue
function estado({ raiz, entorno }) {
  exige(ENTORNOS.includes(entorno), `entorno invalido: ${entorno}`);
  const carpetaEntorno = path.join(raiz, entorno);
  const current = leerCurrent(carpetaEntorno);
  exige(current, `no hay despliegues en ${entorno}`);
  const manifiesto = path.join(carpetaEntorno, current.actual, 'release.json');
  exige(fs.existsSync(manifiesto), `el release vigente ${current.actual} no tiene release.json`);
  return leerJson(manifiesto);
}

// Extrae un zip con bsdtar (lee zip). En Windows se usa el tar.exe del sistema: el tar de Git (GNU) no lee zip.
function extraerZip(zip, destino) {
  fs.mkdirSync(destino, { recursive: true });
  const tar = process.platform === 'win32'
    ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    : 'tar';
  execFileSync(tar, ['-xf', zip, '-C', destino], { stdio: 'inherit' });
}

function buscarZip(dir, prefijo) {
  const encontrados = fs.readdirSync(dir).filter((f) => f.startsWith(prefijo) && f.endsWith('.zip'));
  exige(encontrados.length === 1, `se esperaba un zip ${prefijo}*.zip en ${dir} y hay ${encontrados.length}`);
  return path.join(dir, encontrados[0]);
}

function opciones(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 2) o[argv[i].replace(/^--/, '')] = argv[i + 1];
  return o;
}

module.exports = { ENTORNOS, verificarBackend, verificarFrontend, prepararRelease, rollback, estado };

if (require.main === module) {
  const [comando, ...resto] = process.argv.slice(2);
  const o = opciones(resto);
  try {
    if (comando === 'desplegar') {
      exige(o.artefacto && o.raiz && o.entorno, 'faltan --artefacto, --raiz o --entorno');
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'incident-hub-'));
      extraerZip(buscarZip(o.artefacto, 'incident-hub-backend-'), path.join(tmp, 'backend'));
      extraerZip(buscarZip(o.artefacto, 'incident-hub-frontend-'), path.join(tmp, 'frontend'));
      const m = prepararRelease({
        backendDir: path.join(tmp, 'backend'), frontendDir: path.join(tmp, 'frontend'),
        raiz: o.raiz, entorno: o.entorno, buildId: o.build, commit: o.commit,
      });
      fs.rmSync(tmp, { recursive: true, force: true });
      console.log(`Desplegado ${m.release} en ${m.entorno} (commit ${m.commit ? m.commit.slice(0, 7) : 'n/d'}).`);
    } else if (comando === 'estado') {
      exige(o.raiz && o.entorno, 'faltan --raiz o --entorno');
      const m = estado({ raiz: o.raiz, entorno: o.entorno });
      console.log(`Validado ${m.entorno}: release ${m.release} (version ${m.version}, build ${m.build}, ${m.fecha}).`);
    } else if (comando === 'rollback') {
      exige(o.raiz && o.entorno, 'faltan --raiz o --entorno');
      const r = rollback({ raiz: o.raiz, entorno: o.entorno });
      console.log(`Rollback en ${o.entorno}: vigente ${r.actual} (antes ${r.anterior}).`);
    } else {
      throw new Error('Uso: deploy.js desplegar|rollback --entorno dev|staging|prod ...');
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
