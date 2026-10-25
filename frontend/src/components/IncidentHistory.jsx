import React, { useEffect, useState } from 'react';
import { fetchEvents, addComment } from '../api.js';

const ETIQUETAS = { COMENTARIO: 'Comentario', CAMBIO_ESTADO: 'Cambio de estado', ASIGNACION: 'Asignación' };

const formatFecha = (iso) =>
  new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });

// Historial (bitacora) de un incidente con formulario para agregar comentarios.
// El autor del comentario es el usuario autenticado (lo decide el backend por el token).
// refreshKey cambia cuando el incidente se modifica, para recargar los eventos automaticos.
export default function IncidentHistory({ incidentId, refreshKey, cerrado = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEvents(incidentId)
      .then((data) => { if (!cancelled) { setEvents(data); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [incidentId, refreshKey]);

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await addComment(incidentId, texto.trim());
      // El evento creado no trae el nombre del autor; se recarga el historial completo
      setTexto('');
      setEvents(await fetchEvents(incidentId));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="history" aria-label="Historial">
      <h3>Historial</h3>
      {error && <p role="alert" className="error">{error}</p>}
      {loading ? (
        <p>Cargando historial…</p>
      ) : events.length === 0 ? (
        <p>Sin actividad todavía.</p>
      ) : (
        <ol className="events">
          {events.map((ev) => (
            <li key={ev.id} className={`event event-${ev.tipo.toLowerCase()}`}>
              <span className="event-tipo">{ETIQUETAS[ev.tipo] ?? ev.tipo}</span>
              <span className="event-meta">{ev.autor} · <time dateTime={ev.created_at}>{formatFecha(ev.created_at)}</time></span>
              <p>{ev.detalle}</p>
            </li>
          ))}
        </ol>
      )}
      {cerrado ? (
        <p className="hint">El incidente está cerrado: no admite comentarios.</p>
      ) : (
        <form onSubmit={submit} className="comment-form">
          <label>
            Comentario
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} rows={3} />
          </label>
          <button type="submit" disabled={sending || texto.trim() === ''}>
            Comentar
          </button>
        </form>
      )}
    </section>
  );
}
