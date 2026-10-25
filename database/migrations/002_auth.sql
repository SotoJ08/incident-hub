-- AB#379: credenciales y especialidad de los tecnicos

-- Hash de la contrasena (scrypt$sal$hash); NULL = el usuario aun no puede iniciar sesion
ALTER TABLE users ADD COLUMN password_hash VARCHAR(200);

-- Categorias que atiende cada tecnico: base de la asignacion automatica y de la visibilidad
CREATE TABLE tecnico_categorias (
  user_id      INTEGER NOT NULL REFERENCES users(id),
  category_id  INTEGER NOT NULL REFERENCES categories(id),
  PRIMARY KEY (user_id, category_id)
);

CREATE INDEX idx_tecnico_categorias_category ON tecnico_categorias(category_id);
