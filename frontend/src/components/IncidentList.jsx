import React, { useEffect, useState } from 'react';
import { fetchIncidents, fetchCategories, fetchTechnicians } from '../api.js';
import Filters from './Filters.jsx';

const EMPTY = { estado: '', prioridad: '', category_id: '', tecnico_id: '' };

export default function IncidentList() {
  const [filters, setFilters] = useState(EMPTY);
  const [incidents, setIncidents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchTechnicians()])
      .then(([c, t]) => { setCategories(c); setTechnicians(t); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchIncidents(filters)
      .then((data) => { if (!cancelled) { setIncidents(data); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);

  const categoryName = (id) => categories.find((c) => c.id === id)?.nombre ?? id;
  const techName = (id) => (id == null ? 'Sin asignar' : technicians.find((t) => t.id === id)?.nombre ?? id);

  return (
    <section>
      <Filters
        filters={filters}
        onChange={(name, value) => setFilters((f) => ({ ...f, [name]: value }))}
        categories={categories}
        technicians={technicians}
      />
      {error && <p role="alert" className="error">{error}</p>}
      {loading ? (
        <p>Cargando…</p>
      ) : incidents.length === 0 ? (
        <p>No hay incidentes con esos filtros.</p>
      ) : (
        <table>
          <thead>
            <tr><th>#</th><th>Título</th><th>Categoría</th><th>Prioridad</th><th>Estado</th><th>Técnico</th></tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>{i.titulo}</td>
                <td>{categoryName(i.category_id)}</td>
                <td>{i.prioridad}</td>
                <td>{i.estado}</td>
                <td>{techName(i.tecnico_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
