const { Pool } = require('pg');
const { createApp } = require('./app');

if (!process.env.DATABASE_URL) {
  console.error('Falta la variable de entorno DATABASE_URL');
  process.exit(1);
}
const port = process.env.PORT || 3000;
createApp(new Pool({ connectionString: process.env.DATABASE_URL })).listen(port, () =>
  console.log(`API escuchando en el puerto ${port}`)
);
