-- Datos de desarrollo (sin credenciales)
INSERT INTO users (nombre, email, rol) VALUES
  ('Ana Solicitante', 'ana@example.com', 'SOLICITANTE'),
  ('Luis Tecnico',    'luis@example.com', 'TECNICO'),
  ('Marta Tecnica',   'marta@example.com', 'TECNICO'),
  ('Admin TI',        'admin@example.com', 'ADMIN');

INSERT INTO categories (nombre, parent_id) VALUES
  ('Equipo de computo', NULL),
  ('Sistema Institucional', NULL),
  ('Gestion de Accesos', NULL),
  ('Telecomunicaciones', NULL);
