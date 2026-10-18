#!/usr/bin/env node
// Comprueba que un secreto llego al entorno del paso (AB#355) sin imprimir nunca su valor.
// Uso: node devops/scripts/verify-secret.js NOMBRE
//
// - Azure Pipelines: los secretos no se exponen solos; el paso debe mapearlos con `env:`.
//   Si la variable no existe, Azure deja el texto literal "$(NOMBRE)".
// - GitHub Actions: un secret inexistente llega como cadena vacia.
function verificar(nombre, env = process.env) {
  const valor = env[nombre];
  if (valor === undefined || valor.trim() === '') return { ok: false, motivo: 'vacia o no definida' };
  if (valor === `$(${nombre})`) return { ok: false, motivo: 'variable no definida en el variable group' };
  return { ok: true };
}

module.exports = { verificar };

if (require.main === module) {
  const nombre = process.argv[2];
  if (!nombre) {
    console.error('Uso: node devops/scripts/verify-secret.js NOMBRE');
    process.exit(2);
  }
  const r = verificar(nombre);
  if (r.ok) {
    console.log(`${nombre}: configurada (valor oculto).`);
  } else {
    console.error(`${nombre}: ${r.motivo}. Cree el secreto en el variable group / GitHub Secrets (ver docs/security.md).`);
    process.exit(1);
  }
}
