const { Pool } = require('pg');
const { createApp } = require('./app');

if (!process.env.DATABASE_URL) {
  console.error('Falta la variable de entorno DATABASE_URL');
  process.exit(1);
}

// AUTH_SECRET firma los tokens de sesion. En produccion es obligatoria; en desarrollo, si falta,
// se usa un secreto aleatorio por proceso y las sesiones se pierden al reiniciar.
if (!process.env.AUTH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Falta la variable de entorno AUTH_SECRET (obligatoria en produccion)');
    process.exit(1);
  }
  console.warn('AUTH_SECRET no definida: se usa un secreto aleatorio; las sesiones se pierden al reiniciar.');
}

const port = process.env.PORT || 3000;
createApp(new Pool({ connectionString: process.env.DATABASE_URL })).listen(port, () =>
  console.log(`API escuchando en el puerto ${port}`)
);
