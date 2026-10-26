import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IncidentForm from '../src/components/IncidentForm.jsx';
import IncidentList from '../src/components/IncidentList.jsx';
import { ADMIN, SOLICITANTE, TECNICOS, CATEGORIAS } from './fixtures.js';

function mockPost(response, ok = true) {
  const fetchMock = vi.fn(async () => ({ ok, status: ok ? 201 : 400, json: async () => response }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// `scope` acota las consultas al formulario (en la lista tambien existe el filtro "Categoría")
async function fill({ titulo = 'No enciende', descripcion = 'Sin energia', categoria = '1' } = {}, scope = screen) {
  await userEvent.type(scope.getByLabelText('Título'), titulo);
  await userEvent.type(scope.getByLabelText('Descripción'), descripcion);
  await userEvent.selectOptions(scope.getByLabelText('Categoría'), categoria);
}

describe('IncidentForm', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('el boton esta deshabilitado hasta completar los campos obligatorios', async () => {
    mockPost({});
    render(<IncidentForm categories={CATEGORIAS} onCreated={() => {}} />);
    const boton = screen.getByRole('button', { name: 'Crear incidente' });
    expect(boton).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Título'), '   ');
    await userEvent.type(screen.getByLabelText('Descripción'), 'algo');
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), '1');
    expect(boton).toBeDisabled(); // el titulo son solo espacios
    await userEvent.type(screen.getByLabelText('Título'), 'Titulo real');
    expect(boton).toBeEnabled();
  });

  it('avisa que se asigna automaticamente segun la categoria', () => {
    mockPost({});
    render(<IncidentForm categories={CATEGORIAS} onCreated={() => {}} />);
    expect(screen.getByText(/se asignará automáticamente al técnico que atiende la categoría/i)).toBeInTheDocument();
  });

  it('envia los datos recortados y NO envia solicitante: lo decide el backend por el token', async () => {
    const created = { id: 9, titulo: 'No enciende' };
    const fetchMock = mockPost(created);
    const onCreated = vi.fn();
    render(<IncidentForm categories={CATEGORIAS} onCreated={onCreated} />);
    await fill({ titulo: '  No enciende  ', descripcion: ' Sin energia ' });
    await userEvent.click(screen.getByRole('button', { name: 'Crear incidente' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/incidents');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ titulo: 'No enciende', descripcion: 'Sin energia', category_id: 1, prioridad: 'BAJA' });
  });

  it('permite elegir otra prioridad y limpia el formulario al crear', async () => {
    const fetchMock = mockPost({ id: 1 });
    render(<IncidentForm categories={CATEGORIAS} onCreated={() => {}} />);
    await fill();
    await userEvent.selectOptions(screen.getByLabelText('Prioridad'), 'CRITICA');
    await userEvent.click(screen.getByRole('button', { name: 'Crear incidente' }));
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue(''));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).prioridad).toBe('CRITICA');
    expect(screen.getByLabelText('Prioridad')).toHaveValue('BAJA');
  });

  it('muestra los errores del backend y conserva lo escrito', async () => {
    mockPost({ errors: ['category_id no existe'] }, false);
    const onCreated = vi.fn();
    render(<IncidentForm categories={CATEGORIAS} onCreated={onCreated} />);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Crear incidente' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('category_id no existe');
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Título')).toHaveValue('No enciende');
  });
});

describe('IncidentList con formulario', () => {
  beforeEach(() => vi.unstubAllGlobals());

  function mockApi({ nuevo }) {
    const existente = { id: 1, titulo: 'Viejo', descripcion: 'd', category_id: 1, prioridad: 'BAJA', estado: 'NUEVO', tecnico_id: null };
    let lista = [existente];
    const fetchMock = vi.fn(async (url, init) => {
      if (init?.method === 'POST') { lista = [nuevo, existente]; return { ok: true, status: 201, json: async () => nuevo }; }
      const body = url.startsWith('/api/categories') ? CATEGORIAS : url.startsWith('/api/users') ? TECNICOS : url.startsWith('/api/workflow') ? {} : lista;
      return { ok: true, json: async () => body };
    });
    vi.stubGlobal('fetch', fetchMock);
  }

  async function crearDesdeLista(user) {
    render(<IncidentList user={user} />);
    await screen.findByText('Viejo');
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo incidente' }));
    const form = within(screen.getByRole('form', { name: 'Nuevo incidente' }));
    await form.findByRole('option', { name: 'Equipo de computo' });
    await fill({ titulo: 'Recien creado' }, form);
    await userEvent.click(form.getByRole('button', { name: 'Crear incidente' }));
  }

  it('crea un incidente asignado automaticamente y lo informa con el nombre del tecnico', async () => {
    mockApi({ nuevo: { id: 2, titulo: 'Recien creado', descripcion: 'd', category_id: 1, prioridad: 'BAJA', estado: 'ASIGNADO', tecnico_id: 2 } });
    await crearDesdeLista(SOLICITANTE);
    expect(await screen.findByText('Recien creado', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Incidente #2 creado y asignado automáticamente a Luis Tecnico.');
    expect(screen.queryByRole('form', { name: 'Nuevo incidente' })).not.toBeInTheDocument();
  });

  it('si la categoria no tiene tecnico informa que queda pendiente de asignar', async () => {
    mockApi({ nuevo: { id: 3, titulo: 'Recien creado', descripcion: 'd', category_id: 1, prioridad: 'BAJA', estado: 'NUEVO', tecnico_id: null } });
    await crearDesdeLista(ADMIN);
    expect(await screen.findByRole('status')).toHaveTextContent('Incidente #3 creado; queda pendiente de asignar.');
  });

  it('el boton Cancelar oculta el formulario', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => ({ ok: true, json: async () => (url.startsWith('/api/categories') ? CATEGORIAS : []) })));
    render(<IncidentList user={SOLICITANTE} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo incidente' }));
    expect(screen.getByRole('form', { name: 'Nuevo incidente' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('form', { name: 'Nuevo incidente' })).not.toBeInTheDocument();
  });
});
