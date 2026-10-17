# Arquitectura

```
Usuario -> Frontend (React) -> API REST (Node/Express) -> PostgreSQL
```

## Decisiones
- Stack: React + Node/Express + PostgreSQL (referencia del enunciado).
- Estados de incidente: NUEVO -> ASIGNADO -> EN_PROCESO -> RESUELTO -> CERRADO.
- Prioridades: BAJA, MEDIA, ALTA, URGENTE, CRITICA.
- Categorías jerárquicas (ej. Equipo de cómputo > Computadora > Laptop).
- Bitácora: cada cambio de estado o asignación genera un evento en el historial del incidente.

## Modelo de datos (borrador)
- `users` (id, nombre, rol: SOLICITANTE | TECNICO | ADMIN)
- `categories` (id, nombre, parent_id)
- `incidents` (id, titulo, descripcion, category_id, prioridad, estado, solicitante_id, tecnico_id, created_at, updated_at)
- `incident_events` (id, incident_id, autor_id, tipo: COMENTARIO | CAMBIO_ESTADO | ASIGNACION, detalle, created_at)
