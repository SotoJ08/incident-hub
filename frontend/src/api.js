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

async function patchJson(url, body) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.errors?.join('; ') || `Error ${res.status} al actualizar`);
  return data;
}

export const assignIncident = (id, tecnico_id, autor_id) =>
  patchJson(`/api/incidents/${id}/assign`, { tecnico_id, autor_id });
export const changeStatus = (id, estado, autor_id) =>
  patchJson(`/api/incidents/${id}/status`, { estado, autor_id });
export const fetchUsers = () => getJson('/api/users');
export const fetchStats = () => getJson('/api/stats');
export const fetchCategories = () => getJson('/api/categories');
export const fetchTechnicians = () => getJson('/api/users?rol=TECNICO');
