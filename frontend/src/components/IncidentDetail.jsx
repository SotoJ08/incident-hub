import React, { useState } from 'react';
import { assignIncident, changeStatus } from '../api.js';
import { puedeAsignar, puedeOperar } from '../permissions.js';
import IncidentHistory from './IncidentHistory.jsx';

// Panel de operacion de un incidente: asignar tecnico (administrador) y avanzar de estado
// (administrador o tecnico asignado). Quien actua se registra en la bitacora segun el token.
// workflow son las reglas del backend (GET /api/workflow); sin ellas no se ofrecen acciones.
export default function IncidentDetail({ incident, technicians, workflow, user, onUpdated, onClose }) {
  const [tecnicoId, setTecnicoId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const siguientes = workflow?.transiciones?.[incident.estado] ?? [];
  const estadoAsignable = workflow?.asignables?.includes(incident.estado) ?? false;
  const sinTecnico = incident.tecnico_id == null;
  const operar = puedeOperar(user, incident);
  // Solo se ofrecen los tecnicos que atienden la categoria del incidente
  const candidatos = technicians.filter((t) => (t.categorias ?? []).includes(incident.category_id));

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

      {error && <p role="alert" className="error">{error}</p>}

      {puedeAsignar(user) && estadoAsignable && (
        candidatos.length === 0 ? (
          <p className="hint">Ningún técnico atiende la categoría de este incidente.</p>
        ) : (
          <form
            className="detail-action"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => assignIncident(incident.id, Number(tecnicoId)));
            }}
          >
            <label>
              Técnico
              <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
                <option value="">Seleccione…</option>
                {candidatos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={busy || tecnicoId === ''}>
              {sinTecnico ? 'Asignar' : 'Reasignar'}
            </button>
          </form>
        )
      )}

      {siguientes.length > 0 && operar && (
        <div className="detail-action">
          <span>Cambiar estado a:</span>
          {siguientes.map((estado) => (
            <button
              key={estado}
              type="button"
              disabled={busy || sinTecnico}
              onClick={() => run(() => changeStatus(incident.id, estado))}
            >
              {estado}
            </button>
          ))}
          {sinTecnico && <span className="hint">Asigne un técnico primero.</span>}
        </div>
      )}
      {siguientes.length > 0 && !operar && (
        <p className="hint">Solo un administrador o el técnico asignado puede cambiar el estado.</p>
      )}
      {workflow && siguientes.length === 0 && <p className="hint">El incidente está cerrado: no admite más cambios.</p>}
      {!workflow && <p className="hint">Cargando reglas del flujo…</p>}

      <IncidentHistory
        incidentId={incident.id}
        refreshKey={`${incident.estado}-${incident.tecnico_id}`}
        cerrado={incident.estado === 'CERRADO'}
      />
    </aside>
  );
}
