import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  login, fetchIncidents, assignIncident, changeStatus, addComment, createIncident, setUnauthorizedHandler,
} from '../src/api.js';
import { saveToken, clearToken, getToken } from '../src/session.js';

const respuesta = (body, { ok = true, status = 200 } = {}) => ({ ok, status, json: async () => body });
const mockFetch = (res) => {
  const fetchMock = vi.fn(async () => res);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};
const encabezados = (fetchMock) => fetchMock.mock.calls[0][1].headers;

describe('api: sesion y token', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    clearToken();
    setUnauthorizedHandler(() => {});
  });

  it('con sesion iniciada agrega Authorization: Bearer a cada peticion', async () => {
    saveToken('abc.def.ghi');
    const fetchMock = mockFetch(respuesta([]));
    await fetchIncidents();
    expect(encabezados(fetchMock).Authorization).toBe('Bearer abc.def.ghi');
  });

  it('sin sesion no envia Authorization', async () => {
    const fetchMock = mockFetch(respuesta([]));
    await fetchIncidents();
    expect(encabezados(fetchMock).Authorization).toBeUndefined();
  });

  it('login envia correo y contrasena sin token y devuelve la respuesta', async () => {
    const fetchMock = mockFetch(respuesta({ token: 't', user: { id: 4 } }));
    const data = await login('admin@example.com', 'x');
    expect(data.user.id).toBe(4);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'admin@example.com', password: 'x' });
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('un login fallido (401 sin sesion) muestra el mensaje del backend y no dispara el cierre de sesion', async () => {
    const manejador = vi.fn();
    setUnauthorizedHandler(manejador);
    mockFetch(respuesta({ errors: ['credenciales invalidas'] }, { ok: false, status: 401 }));
    await expect(login('a@b.c', 'mala')).rejects.toThrow('credenciales invalidas');
    expect(manejador).not.toHaveBeenCalled();
  });

  it('un 401 con sesion iniciada limpia el token y avisa a la aplicacion', async () => {
    saveToken('vencido');
    const manejador = vi.fn();
    setUnauthorizedHandler(manejador);
    mockFetch(respuesta({ errors: ['no autenticado'] }, { ok: false, status: 401 }));
    await expect(fetchIncidents()).rejects.toThrow(/sesión expiró/);
    expect(getToken()).toBeNull();
    expect(manejador).toHaveBeenCalledTimes(1);
  });

  it('un 403 muestra el mensaje del backend y conserva la sesion', async () => {
    saveToken('valido');
    const manejador = vi.fn();
    setUnauthorizedHandler(manejador);
    mockFetch(respuesta({ errors: ['solo un administrador puede asignar tecnicos'] }, { ok: false, status: 403 }));
    await expect(assignIncident(1, 2)).rejects.toThrow('solo un administrador puede asignar tecnicos');
    expect(getToken()).toBe('valido');
    expect(manejador).not.toHaveBeenCalled();
  });
});

describe('api: el cliente nunca decide quien actua', () => {
  beforeEach(() => { vi.unstubAllGlobals(); clearToken(); });

  it('asignar, cambiar estado, comentar y crear no envian autor ni solicitante', async () => {
    const fetchMock = mockFetch(respuesta({}));
    await assignIncident(5, 2);
    await changeStatus(5, 'EN_PROCESO');
    await addComment(5, 'hola');
    await createIncident({ titulo: 't', descripcion: 'd', category_id: 1, prioridad: 'BAJA' });
    const cuerpos = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body));
    expect(cuerpos).toEqual([
      { tecnico_id: 2 },
      { estado: 'EN_PROCESO' },
      { comentario: 'hola' },
      { titulo: 't', descripcion: 'd', category_id: 1, prioridad: 'BAJA' },
    ]);
    expect(JSON.stringify(cuerpos)).not.toMatch(/autor_id|solicitante_id/);
  });

  it('usa los metodos y rutas del backend', async () => {
    const fetchMock = mockFetch(respuesta({}));
    await assignIncident(5, 2);
    await changeStatus(5, 'RESUELTO');
    await addComment(5, 'x');
    await createIncident({});
    expect(fetchMock.mock.calls.map((c) => [c[1].method, c[0]])).toEqual([
      ['PATCH', '/api/incidents/5/assign'],
      ['PATCH', '/api/incidents/5/status'],
      ['POST', '/api/incidents/5/comments'],
      ['POST', '/api/incidents'],
    ]);
  });
});
