const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'database', 'migrations');

function listMigrations(dir = MIGRATIONS_DIR) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
}

// Aplica en orden las migraciones pendientes usando cualquier cliente con .query()
async function migrate(client, dir = MIGRATIONS_DIR) {
  let done;
  try {
    done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  } catch {
    await client.query(
      'CREATE TABLE schema_migrations (name VARCHAR(200) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())'
    );
    done = new Set();
  }
  const applied = [];
  for (const file of listMigrations(dir)) {
    if (done.has(file)) continue;
    await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    applied.push(file);
  }
  return applied;
}

module.exports = { migrate, listMigrations };

if (require.main === module) {
  const { Client } = require('pg');
  if (!process.env.DATABASE_URL) {
    console.error('Falta la variable de entorno DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  client
    .connect()
    .then(() => migrate(client))
    .then((applied) => console.log(applied.length ? `Aplicadas: ${applied.join(', ')}` : 'Sin migraciones pendientes'))
    .catch((e) => { console.error(e.message); process.exitCode = 1; })
    .finally(() => client.end());
}
