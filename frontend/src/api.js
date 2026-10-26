import { getToken, clearToken } from './session.js';

// Si el backend responde 401 con una sesion iniciada, la sesion expiro: se limpia y se avisa a la aplicacion
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(method, url, body) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    clearToken();
    onUnauthorized();
    throw new Error('Su sesión expiró. Inicie sesión de nuevo.');
  }
  if (!res.ok) throw new Error(data.errors?.join('; ') || `Error ${res.status} al consultar ${url}`);
  return data;
}

const getJson = (url) => request('GET', url);

// Solo envia los filtros con valor
export function fetchIncidents(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '' && v != null));
  const qs = params.toString();
  return getJson(`/api/incidents${qs ? `?${qs}` : ''}`);
}

// Sesion
export const login = (email, password) => request('POST', '/api/auth/login', { email, password });
export const fetchMe = () => getJson('/api/auth/me');

// Quien actua y quien reporta lo decide el backend a partir del token: no se envian autor ni solicitante
export const assignIncident = (id, tecnico_id) => request('PATCH', `/api/incidents/${id}/assign`, { tecnico_id });
export const changeStatus = (id, estado) => request('PATCH', `/api/incidents/${id}/status`, { estado });
export const createIncident = (data) => request('POST', '/api/incidents', data);
export const fetchEvents = (id) => getJson(`/api/incidents/${id}/events`);
export const addComment = (id, comentario) => request('POST', `/api/incidents/${id}/comments`, { comentario });

// Reglas del flujo (transiciones y estados asignables): fuente unica en el backend
export const fetchWorkflow = () => getJson('/api/workflow');
export const fetchStats = () => getJson('/api/stats');
export const fetchCategories = () => getJson('/api/categories');
export const fetchTechnicians = () => getJson('/api/users?rol=TECNICO');
