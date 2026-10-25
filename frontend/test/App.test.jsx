import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { getToken, saveToken, clearToken } from '../src/session.js';
import { WORKFLOW, ADMIN, TECNICO, TECNICOS, CATEGORIAS, TOKEN_FALSO, CLAVE_PRUEBA } from './fixtures.js';

const STATS = {
  total: 1, abiertos: 1, cerrados: 0, criticos: 0, sin_asignar: 1,
  por_estado: { NUEVO: 1, ASIGNADO: 0, EN_PROCESO: 0, RESUELTO: 0, CERRADO: 0 }, por_categoria: [], por_tecnico: [],
};
const INCIDENTE = { id: 1, titulo: 'Laptop no enciende', descripcion: 'd', category_id: 1, prioridad: 'BAJA', estado: 'NUEVO', tecnico_id: null };

// Simula el backend: login, /me y los catalogos; `sesionValida` controla si el token se acepta
function mockBackend({ usuario = ADMIN, sesionValida = true } = {}) {
  const fetchMock = vi.fn(async (url, init) => {
    if (url === '/api/auth/login') return { ok: true, status: 200, json: async () => ({ token: TOKEN_FALSO, user: usuario }) };
    if (url === '/api/workflow') return { ok: true, status: 200, json: async () => WORKFLOW };
    const autorizado = Boolean(init?.headers?.Authorization) && sesionValida;
    if (!autorizado) return { ok: false, status: 401, json: async () => ({ errors: ['no autenticado'] }) };
    const cuerpos = {
      '/api/auth/me': { user: usuario },
      '/api/incidents': [INCIDENTE],
      '/api/categories': CATEGORIAS,
      '/api/users?rol=TECNICO': TECNICOS,
      '/api/stats': STATS,
    };
    return { ok: true, status: 200, json: async () => cuerpos[url] ?? [] };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function iniciarSesion(correo = 'admin@example.com') {
  await userEvent.type(screen.getByLabelText('Correo'), correo);
  await userEvent.type(screen.getByLabelText('Contraseña'), CLAVE_PRUEBA);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('App: sesion', () => {
  beforeEach(() => { vi.unstubAllGlobals(); clearToken(); });

  it('sin sesion muestra solo el inicio de sesion y no consulta datos protegidos', () => {
    const fetchMock = mockBackend();
    render(<App />);
    expect(screen.getByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('al iniciar sesion muestra el usuario con su rol y la lista de incidentes', async () => {
    mockBackend();
    render(<App />);
    await iniciarSesion();
    expect(await screen.findByText('Admin TI')).toBeInTheDocument();
    expect(screen.getByText(/Administrador/)).toBeInTheDocument();
    expect(await screen.findByText('Laptop no enciende')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(getToken()).toBe(TOKEN_FALSO);
  });

  it('ya no existe el selector "Actuando como"', async () => {
    mockBackend();
    render(<App />);
    await iniciarSesion();
    await screen.findByText('Admin TI');
    expect(screen.queryByText('Actuando como')).not.toBeInTheDocument();
  });

  it('con un token guardado valida la sesion con /me y entra sin pedir login', async () => {
    saveToken('guardado');
    const fetchMock = mockBackend({ usuario: TECNICO });
    render(<App />);
    expect(await screen.findByText('Luis Tecnico')).toBeInTheDocument();
    expect(screen.getByText(/· Técnico/)).toBeInTheDocument(); // el rol en la barra de usuario (no la etiqueta del filtro)
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/auth/me')).toBe(true);
  });

  it('un token guardado que ya no vale lleva al inicio de sesion y se descarta', async () => {
    saveToken('vencido');
    mockBackend({ sesionValida: false });
    render(<App />);
    expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it('cerrar sesion vuelve al login y borra el token', async () => {
    mockBackend();
    render(<App />);
    await iniciarSesion();
    await screen.findByText('Admin TI');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it('si la sesion expira durante el uso, vuelve al inicio de sesion', async () => {
    const estado = { valida: true };
    const base = mockBackend();
    const original = base.getMockImplementation();
    base.mockImplementation(async (url, init) => original(url, estado.valida ? init : { ...init, headers: {} }));
    render(<App />);
    await iniciarSesion();
    await screen.findByText('Laptop no enciende');
    estado.valida = false;
    await userEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it('un login fallido deja el formulario y muestra el motivo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ errors: ['credenciales invalidas'] }) })));
    render(<App />);
    await iniciarSesion();
    expect(await screen.findByRole('alert')).toHaveTextContent('credenciales invalidas');
    expect(screen.getByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});

describe('App: navegacion', () => {
  beforeEach(() => { vi.unstubAllGlobals(); clearToken(); });

  it('permite cambiar entre Incidentes y Dashboard', async () => {
    const fetchMock = mockBackend();
    render(<App />);
    await iniciarSesion();
    await screen.findByText('Laptop no enciende');
    expect(screen.getByRole('button', { name: 'Incidentes' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(await screen.findByText('Sin asignar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => c[0] === '/api/stats')).toBe(true));
  });
});
