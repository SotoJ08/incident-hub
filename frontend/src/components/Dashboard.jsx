import React, { useEffect, useState } from 'react';
import { fetchStats } from '../api.js';

function Kpi({ label, value, tone }) {
  return (
    <div className={`kpi${tone ? ` kpi-${tone}` : ''}`}>
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

// Lista de barras horizontales; el ancho es relativo al mayor valor de la lista
function BarList({ title, items }) {
  const max = Math.max(1, ...items.map((i) => i.total));
  return (
    <section className="panel" aria-label={title}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>Sin datos.</p>
      ) : (
        <ul className="bars">
          {items.map((i) => (
            <li key={i.label}>
              <span className="bar-label">{i.label}</span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar-fill" style={{ width: `${(i.total / max) * 100}%` }} />
              </span>
              <span className="bar-value">{i.total}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchStats()
      .then((data) => { if (!cancelled) setStats(data); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!stats) return <p>Cargando…</p>;

  return (
    <section aria-label="Dashboard">
      <div className="kpis">
        <Kpi label="Abiertos" value={stats.abiertos} />
        <Kpi label="Cerrados" value={stats.cerrados} />
        <Kpi label="Críticos" value={stats.criticos} tone={stats.criticos > 0 ? 'danger' : undefined} />
        <Kpi label="Sin asignar" value={stats.sin_asignar} />
      </div>
      <div className="panels">
        <BarList title="Por estado" items={Object.entries(stats.por_estado).map(([label, total]) => ({ label, total }))} />
        <BarList title="Por categoría" items={stats.por_categoria.map((c) => ({ label: c.nombre, total: c.total }))} />
        <BarList title="Por técnico" items={stats.por_tecnico.map((t) => ({ label: t.nombre, total: t.total }))} />
      </div>
    </section>
  );
}
