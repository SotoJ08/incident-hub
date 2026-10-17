// Verifica la sintaxis de todo src/ y copia el codigo a dist/ para empaquetarlo
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

function listJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listJs(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []
  );
}

for (const file of listJs(src)) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(src, path.join(dist, 'src'), { recursive: true });
fs.copyFileSync(path.join(root, 'package.json'), path.join(dist, 'package.json'));
fs.copyFileSync(path.join(root, 'package-lock.json'), path.join(dist, 'package-lock.json'));
console.log('Build OK -> backend/dist');
