-- AB#342: modelo de datos inicial de IT Incident Hub

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  rol         VARCHAR(20)  NOT NULL DEFAULT 'SOLICITANTE'
              CHECK (rol IN ('SOLICITANTE', 'TECNICO', 'ADMIN')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(120) NOT NULL,
  parent_id  INTEGER REFERENCES categories(id)
);

CREATE TABLE incidents (
  id            SERIAL PRIMARY KEY,
  titulo        VARCHAR(200) NOT NULL,
  descripcion   TEXT         NOT NULL,
  category_id   INTEGER      NOT NULL REFERENCES categories(id),
  prioridad     VARCHAR(10)  NOT NULL DEFAULT 'BAJA'
                CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE', 'CRITICA')),
  estado        VARCHAR(12)  NOT NULL DEFAULT 'NUEVO'
                CHECK (estado IN ('NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO')),
  solicitante_id INTEGER     NOT NULL REFERENCES users(id),
  tecnico_id    INTEGER      REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE incident_events (
  id           SERIAL PRIMARY KEY,
  incident_id  INTEGER     NOT NULL REFERENCES incidents(id),
  autor_id     INTEGER     NOT NULL REFERENCES users(id),
  tipo         VARCHAR(20) NOT NULL
               CHECK (tipo IN ('COMENTARIO', 'CAMBIO_ESTADO', 'ASIGNACION')),
  detalle      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_estado    ON incidents(estado);
CREATE INDEX idx_incidents_prioridad ON incidents(prioridad);
CREATE INDEX idx_incidents_tecnico   ON incidents(tecnico_id);
CREATE INDEX idx_events_incident     ON incident_events(incident_id);
