async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error ${res.status} al consultar ${url}`);
  return res.json();
}

// Solo envia los filtros con valor
export function fetchIncidents(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '' && v != null));
  const qs = params.toString();
  return getJson(`/api/incidents${qs ? `?${qs}` : ''}`);
}

export const fetchStats = () => getJson('/api/stats');
export const fetchCategories = () => getJson('/api/categories');
export const fetchTechnicians = () => getJson('/api/users?rol=TECNICO');
