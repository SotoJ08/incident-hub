-- Datos de desarrollo y demostracion.
-- Todos los usuarios usan la misma contrasena de PRUEBA, documentada en el README; aqui solo se guardan sus hashes scrypt.
-- Para regenerar un hash: node backend/scripts/hash-password.js "<contrasena>" <sal-hex>
INSERT INTO users (nombre, email, rol, password_hash) VALUES
  ('Ana Solicitante', 'ana@example.com', 'SOLICITANTE', 'scrypt$8e43ca37701228e74983efdbd0cff5c1$47d73be3b77ee500e1a7e336ed884debab42d4f3d66536cd38ee2822d0e6133e3e11f6fb68230366c4b7b0f03179fcf4776147f0c42b9dc90a55d8a2fd518786'),
  ('Luis Tecnico', 'luis@example.com', 'TECNICO', 'scrypt$861d62c5b964e71b42e61aeb4e876f86$ee1e12ba852d91bbe30f4b308f2c93ba551f06ed1782f364f0ae79f355d99fe242026c8dc3ba149769fb389e793176bbedd0d0ab60945ce97f70e6cabdb6e023'),
  ('Marta Tecnica', 'marta@example.com', 'TECNICO', 'scrypt$b8a97658a5b603f702519ba8a17197e5$7eca4b7ad629746c0aec1509c7a354625cc3e2c4ef751bafaa1f2a2e492548b0395a23a046a75efd6bf6c7d0fdee3d58bdba80e9eca5f5c1e65f578b3f5d7b01'),
  ('Admin TI', 'admin@example.com', 'ADMIN', 'scrypt$258d8dc916db8cea2cafb6c3cd0cb024$fc0fd8b27e75d6fc9d66f3ef01bf78f95be993c65dc066ff5cf99f024d0042f58a71ee1dadb1d84cfa177cf5aee360745b584b5e957050b03fdf859afdf2e0ca'),
  ('Carlos Teleco', 'carlos@example.com', 'TECNICO', 'scrypt$e413ca7fc7d0b31892e9d67f1953849a$f972dde6c085b9872f4bb9be56edec442403cb60fb7cf6d32b7b81504e57e16f3d784dca0872987be740565369f0075d8654aaf7ff72ee9172f3f5bd238e8c74'),
  ('Pedro Solicitante', 'pedro@example.com', 'SOLICITANTE', 'scrypt$6b02958be1505abf91d5a12dc8a97cd4$4e682b41ba4e4c5142d3489c520939c6ee0404f08a892266a063e2ec88334f09c708b69183fb306fe0c46be789c4407d1b9b96cfd4e37ce5e603a134877bb7ab');

INSERT INTO categories (nombre, parent_id) VALUES
  ('Equipo de computo', NULL),
  ('Sistema Institucional', NULL),
  ('Gestion de Accesos', NULL),
  ('Telecomunicaciones', NULL),
  ('Otros', NULL);

-- Especialidad de cada tecnico (la categoria 5, Otros, no tiene tecnico: la asigna un administrador)
INSERT INTO tecnico_categorias (user_id, category_id) VALUES
  (2, 1),
  (3, 2),
  (3, 3),
  (5, 4);
