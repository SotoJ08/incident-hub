import React, { useEffect, useState } from 'react';
import IncidentList from './components/IncidentList.jsx';
import Dashboard from './components/Dashboard.jsx';
import { fetchUsers } from './api.js';

const VISTAS = [
  { id: 'incidentes', label: 'Incidentes' },
  { id: 'dashboard', label: 'Dashboard' },
];

export default function App() {
  const [vista, setVista] = useState('incidentes');
  const [users, setUsers] = useState([]);
  const [actorId, setActorId] = useState(null);

  // Sin autenticacion todavia: la persona elige "quien actua" y se envia como autor_id
  useEffect(() => {
    fetchUsers()
      .then((list) => setUsers(Array.isArray(list) ? list : []))
      .catch(() => setUsers([]));
  }, []);

  return (
    <main>
      <h1>IT Incident Hub</h1>
      <div className="topbar">
        <nav aria-label="Vistas" className="tabs">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-current={vista === v.id ? 'page' : undefined}
              onClick={() => setVista(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>
        <label className="actor">
          Actuando como
          <select value={actorId ?? ''} onChange={(e) => setActorId(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">Seleccione…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
            ))}
          </select>
        </label>
      </div>
      {vista === 'incidentes' ? <IncidentList actorId={actorId} /> : <Dashboard />}
    </main>
  );
}
