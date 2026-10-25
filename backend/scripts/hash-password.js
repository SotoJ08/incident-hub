#!/usr/bin/env node
// Genera el hash scrypt de una contrasena para insertarlo en users.password_hash (AB#379).
// Uso: node backend/scripts/hash-password.js "<contrasena>" [<sal-hex>]
// Sin sal se genera una aleatoria; con sal fija el resultado es reproducible (util para el seed).
const { hashPassword } = require('../src/auth');

const [password, salt] = process.argv.slice(2);
if (!password) {
  console.error('Uso: node backend/scripts/hash-password.js "<contrasena>" [<sal-hex>]');
  process.exit(2);
}
console.log(hashPassword(password, salt));
