import React, { useEffect, useState } from 'react';
import { fetchIncidents, fetchCategories, fetchTechnicians, fetchWorkflow } from '../api.js';
import { alcance } from '../permissions.js';
import Filters from './Filters.jsx';
import IncidentDetail from './IncidentDetail.jsx';
import IncidentForm from './IncidentForm.jsx';

const EMPTY = { estado: '', prioridad: '', category_id: '', tecnico_id: '' };

// Lista de incidentes: el backend ya limita lo que cada rol puede ver; aqui solo se muestra
export default function IncidentList({ user }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [created, setCreated] = useState(null);
  const [filters, setFilters] = useState(EMPTY);
  const [incidents, setIncidents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchTechnicians(), fetchWorkflow()])
      .then(([c, t, w]) => { setCategories(c); setTechnicians(t); setWorkflow(w); })
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
  }, [filters, reloadKey]);

  const categoryName = (id) => categories.find((c) => c.id === id)?.nombre ?? id;
  const techName = (id) => (id == null ? 'Sin asignar' : technicians.find((t) => t.id === id)?.nombre ?? id);
  const selected = incidents.find((i) => i.id === selectedId) ?? null;
  const replaceIncident = (updated) => setIncidents((list) => list.map((i) => (i.id === updated.id ? updated : i)));

  return (
    <section>
      <p className="scope">{alcance(user)}</p>
      <div className="list-actions">
        <button type="button" aria-expanded={showForm} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : 'Nuevo incidente'}
        </button>
        {created && (
          <p role="status" className="success">
            Incidente #{created.id} creado
            {created.tecnico_id != null ? ` y asignado automáticamente a ${techName(created.tecnico_id)}.` : '; queda pendiente de asignar.'}
          </p>
        )}
      </div>
      {showForm && (
        <IncidentForm
          categories={categories}
          onCreated={(incident) => {
            setCreated(incident);
            setShowForm(false);
            setReloadKey((k) => k + 1); // recarga la lista respetando los filtros activos
          }}
        />
      )}
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
        <p>No hay incidentes para mostrar.</p>
      ) : (
        <table>
          <thead>
            <tr><th>#</th><th>Título</th><th>Categoría</th><th>Prioridad</th><th>Estado</th><th>Técnico</th><th></th></tr>
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
                <td>
                  <button type="button" aria-label={`Ver incidente ${i.id}`} onClick={() => setSelectedId(i.id)}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && (
        <IncidentDetail
          incident={selected}
          technicians={technicians}
          workflow={workflow}
          user={user}
          onUpdated={replaceIncident}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
}
