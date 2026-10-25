import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../src/components/Login.jsx';
import { getToken, clearToken } from '../src/session.js';
import { ADMIN, TOKEN_FALSO, CLAVE_PRUEBA } from './fixtures.js';

function mockLogin({ ok = true, body = { token: TOKEN_FALSO, user: ADMIN } } = {}) {
  const fetchMock = vi.fn(async () => ({ ok, status: ok ? 200 : 401, json: async () => body }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function escribir(correo, clave) {
  if (correo) await userEvent.type(screen.getByLabelText('Correo'), correo);
  if (clave) await userEvent.type(screen.getByLabelText('Contraseña'), clave);
}

describe('Login', () => {
  beforeEach(() => { vi.unstubAllGlobals(); clearToken(); });

  it('el boton Entrar espera a tener correo y contrasena', async () => {
    mockLogin();
    render(<Login onLogin={() => {}} />);
    const boton = screen.getByRole('button', { name: 'Entrar' });
    expect(boton).toBeDisabled();
    await escribir('admin@example.com');
    expect(boton).toBeDisabled();
    await escribir(null, 'algo');
    expect(boton).toBeEnabled();
  });

  it('el campo de contrasena oculta lo escrito y el de correo lo sugiere al navegador', () => {
    mockLogin();
    render(<Login onLogin={() => {}} />);
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Correo')).toHaveAttribute('type', 'email');
  });

  it('con credenciales validas guarda la sesion y entrega el usuario', async () => {
    const fetchMock = mockLogin();
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);
    await escribir('  admin@example.com  ', CLAVE_PRUEBA);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(ADMIN));
    expect(getToken()).toBe(TOKEN_FALSO);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'admin@example.com', password: CLAVE_PRUEBA });
  });

  it('con credenciales invalidas muestra el error, limpia la contrasena y no guarda sesion', async () => {
    mockLogin({ ok: false, body: { errors: ['credenciales invalidas'] } });
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);
    await escribir('admin@example.com', 'mala');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('credenciales invalidas');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Correo')).toHaveValue('admin@example.com');
    expect(onLogin).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it('se puede enviar con la tecla Enter', async () => {
    const fetchMock = mockLogin();
    render(<Login onLogin={() => {}} />);
    await escribir('admin@example.com', 'x');
    await userEvent.type(screen.getByLabelText('Contraseña'), '{Enter}');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
