#!/usr/bin/env node
// Escaner de secretos (AB#355): falla si un archivo versionado parece contener credenciales.
// Nunca imprime el valor encontrado, solo archivo, linea y regla.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REGLAS = [
  { id: 'clave-privada', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { id: 'token-github', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { id: 'clave-aws', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'token-slack', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  // PAT de Azure DevOps: 52 caracteres base32 (a-z y 2-7) precedidos de pat/token/key
  { id: 'pat-azure-devops', re: /(?:pat|token|key)\w*\s*[:=]\s*['"]?[a-z2-7]{52}\b/i },
  // Credenciales dentro de una URL: esquema://usuario:clave@host (se ignoran marcadores <...>, ${...} y $(...))
  { id: 'credencial-en-url', re: /:\/\/[^\s:@/]+:(?![<$])[^\s@/<$]{3,}@/ },
  // Asignaciones literales de password/secret/token con valor no vacio y no parametrizado
  { id: 'asignacion-secreta', re: /\b(?:password|passwd|secret|api[_-]?key|token)\b\s*[:=]\s*['"](?![<$])[^'"\s]{8,}['"]/i },
];

const EXTENSIONES = new Set(['.js', '.jsx', '.json', '.yml', '.yaml', '.md', '.sql', '.env', '.html', '.css', '.txt', '.cmd', '.ps1', '.sh', '']);
const OMITIR = new Set(['package-lock.json']);
const MAX_BYTES = 1024 * 1024;

// Devuelve [{ linea, regla }] sin incluir nunca el texto coincidente
function scanContent(text) {
  const hallazgos = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const { id, re } of REGLAS) if (re.test(line)) hallazgos.push({ linea: i + 1, regla: id });
  });
  return hallazgos;
}

function trackedFiles(cwd) {
  return execFileSync('git', ['ls-files', '-z'], { cwd, encoding: 'utf8' }).split('\0').filter(Boolean);
}

function scanRepo(cwd = process.cwd()) {
  const resultados = [];
  for (const rel of trackedFiles(cwd)) {
    if (OMITIR.has(path.basename(rel)) || !EXTENSIONES.has(path.extname(rel).toLowerCase())) continue;
    const abs = path.join(cwd, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).size > MAX_BYTES) continue;
    for (const h of scanContent(fs.readFileSync(abs, 'utf8'))) resultados.push({ archivo: rel, ...h });
  }
  return resultados;
}

module.exports = { scanContent, scanRepo, REGLAS };

if (require.main === module) {
  const resultados = scanRepo();
  if (resultados.length === 0) {
    console.log('Escaner de secretos: sin hallazgos.');
  } else {
    for (const r of resultados) console.error(`POSIBLE SECRETO: ${r.archivo}:${r.linea} (${r.regla})`);
    console.error(`${resultados.length} hallazgo(s). Mueva los valores a variables protegidas y rote las credenciales expuestas.`);
    process.exit(1);
  }
}
