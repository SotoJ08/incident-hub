import React, { useEffect, useState } from 'react';
import Login from './components/Login.jsx';
import IncidentList from './components/IncidentList.jsx';
import Dashboard from './components/Dashboard.jsx';
import { fetchMe, setUnauthorizedHandler } from './api.js';
import { getToken, clearToken } from './session.js';
import { ROLES } from './permissions.js';

const VISTAS = [
  { id: 'incidentes', label: 'Incidentes' },
  { id: 'dashboard', label: 'Dashboard' },
];

export default function App() {
  const [vista, setVista] = useState('incidentes');
  const [user, setUser] = useState(null);
  // Con un token guardado hay que validarlo antes de decidir entre el login y la aplicacion
  const [comprobando, setComprobando] = useState(() => Boolean(getToken()));

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null)); // sesion expirada: vuelve al login
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    fetchMe()
      .then(({ user: actual }) => setUser(actual))
      .catch(() => clearToken())
      .finally(() => setComprobando(false));
  }, []);

  function cerrarSesion() {
    clearToken();
    setUser(null);
    setVista('incidentes');
  }

  if (comprobando) return <main><p>Cargando…</p></main>;

  return (
    <main>
      <h1>IT Incident Hub</h1>
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <>
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
            <div className="userbar">
              <span>
                <strong>{user.nombre}</strong> · {ROLES[user.rol] ?? user.rol}
              </span>
              <button type="button" onClick={cerrarSesion}>Cerrar sesión</button>
            </div>
          </div>
          {vista === 'incidentes' ? <IncidentList user={user} /> : <Dashboard />}
        </>
      )}
    </main>
  );
}
