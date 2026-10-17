import React, { useState } from 'react';
import { createIncident } from '../api.js';
import { PRIORIDADES } from '../constants.js';

const INICIAL = { titulo: '', descripcion: '', category_id: '', prioridad: 'BAJA' };

// Formulario de alta de incidentes. El solicitante es quien actua (actorId) hasta tener autenticacion.
export default function IncidentForm({ categories, actorId, onCreated }) {
  const [values, setValues] = useState(INICIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));
  const completo = values.titulo.trim() !== '' && values.descripcion.trim() !== '' && values.category_id !== '';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createIncident({
        titulo: values.titulo.trim(),
        descripcion: values.descripcion.trim(),
        category_id: Number(values.category_id),
        prioridad: values.prioridad,
        solicitante_id: actorId,
      });
      setValues(INICIAL);
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="incident-form" onSubmit={submit} aria-label="Nuevo incidente">
      <h2>Nuevo incidente</h2>
      {actorId == null && <p className="hint">Seleccione quién actúa: será el solicitante del incidente.</p>}
      {error && <p role="alert" className="error">{error}</p>}
      <label>
        Título
        <input type="text" value={values.titulo} onChange={set('titulo')} maxLength={200} />
      </label>
      <label>
        Descripción
        <textarea value={values.descripcion} onChange={set('descripcion')} rows={4} />
      </label>
      <div className="form-row">
        <label>
          Categoría
          <select value={values.category_id} onChange={set('category_id')}>
            <option value="">Seleccione…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Prioridad
          <select value={values.prioridad} onChange={set('prioridad')}>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" disabled={busy || actorId == null || !completo}>Crear incidente</button>
    </form>
  );
}
