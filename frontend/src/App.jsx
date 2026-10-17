import React, { useState } from 'react';
import IncidentList from './components/IncidentList.jsx';
import Dashboard from './components/Dashboard.jsx';

const VISTAS = [
  { id: 'incidentes', label: 'Incidentes' },
  { id: 'dashboard', label: 'Dashboard' },
];

export default function App() {
  const [vista, setVista] = useState('incidentes');
  return (
    <main>
      <h1>IT Incident Hub</h1>
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
      {vista === 'incidentes' ? <IncidentList /> : <Dashboard />}
    </main>
  );
}
