import React, { useState } from 'react';
import { assignIncident, changeStatus } from '../api.js';
import { TRANSICIONES, ESTADOS_ASIGNABLES } from '../constants.js';

// Panel de operacion de un incidente: asignar tecnico y avanzar de estado.
// actorId es quien realiza la accion (se registra en la bitacora).
export default function IncidentDetail({ incident, technicians, actorId, onUpdated, onClose }) {
  const [tecnicoId, setTecnicoId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const siguientes = TRANSICIONES[incident.estado] ?? [];
  const puedeAsignar = ESTADOS_ASIGNABLES.includes(incident.estado);
  const sinActor = actorId == null;
  const sinTecnico = incident.tecnico_id == null;

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      onUpdated(updated);
      setTecnicoId('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="detail" aria-label={`Incidente ${incident.id}`}>
      <header>
        <h2>#{incident.id} {incident.titulo}</h2>
        <button type="button" onClick={onClose}>Cerrar</button>
      </header>
      <p>{incident.descripcion}</p>
      <p>Estado actual: <strong>{incident.estado}</strong></p>

      {sinActor && <p className="hint">Seleccione quién actúa para poder operar el incidente.</p>}
      {error && <p role="alert" className="error">{error}</p>}

      {puedeAsignar && (
        <form
          className="detail-action"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => assignIncident(incident.id, Number(tecnicoId), actorId));
          }}
        >
          <label>
            Técnico
            <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
              <option value="">Seleccione…</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy || sinActor || tecnicoId === ''}>
            {sinTecnico ? 'Asignar' : 'Reasignar'}
          </button>
        </form>
      )}

      {siguientes.length > 0 && (
        <div className="detail-action">
          <span>Cambiar estado a:</span>
          {siguientes.map((estado) => (
            <button
              key={estado}
              type="button"
              disabled={busy || sinActor || sinTecnico}
              onClick={() => run(() => changeStatus(incident.id, estado, actorId))}
            >
              {estado}
            </button>
          ))}
          {sinTecnico && <span className="hint">Asigne un técnico primero.</span>}
        </div>
      )}
      {siguientes.length === 0 && <p className="hint">El incidente está cerrado: no admite más cambios.</p>}
    </aside>
  );
}
