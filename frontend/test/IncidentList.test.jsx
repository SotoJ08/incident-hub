import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IncidentList from '../src/components/IncidentList.jsx';
import { WORKFLOW } from './fixtures.js';

const categories = [{ id: 1, nombre: 'Equipo de computo', parent_id: null }, { id: 2, nombre: 'Sistema Institucional', parent_id: null }];
const technicians = [{ id: 2, nombre: 'Luis Tecnico', rol: 'TECNICO' }, { id: 3, nombre: 'Marta Tecnica', rol: 'TECNICO' }];
const incidents = [
  { id: 2, titulo: 'Sin sistema', category_id: 2, prioridad: 'CRITICA', estado: 'ASIGNADO', tecnico_id: 2 },
  { id: 1, titulo: 'Laptop no enciende', category_id: 1, prioridad: 'BAJA', estado: 'NUEVO', tecnico_id: null },
];

function mockApi(listResponse = incidents) {
  const fetchMock = vi.fn(async (url) => {
    const body = url.startsWith('/api/categories') ? categories
      : url.startsWith('/api/users') ? technicians
      : url.startsWith('/api/workflow') ? WORKFLOW : listResponse;
    return { ok: true, json: async () => body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const incidentCalls = (fetchMock) => fetchMock.mock.calls.map((c) => c[0]).filter((u) => u.startsWith('/api/incidents'));

describe('IncidentList', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('muestra los incidentes con categoria y tecnico resueltos por nombre', async () => {
    mockApi();
    render(<IncidentList />);
    expect(await screen.findByText('Laptop no enciende')).toBeInTheDocument();
    expect(screen.getByText('Sin sistema')).toBeInTheDocument();
    expect(await screen.findByText('Luis Tecnico', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
  });

  it('pide la lista sin filtros al cargar', async () => {
    const fetchMock = mockApi();
    render(<IncidentList />);
    await screen.findByText('Sin sistema');
    expect(incidentCalls(fetchMock)[0]).toBe('/api/incidents');
  });

  it('envia el filtro elegido al backend y recarga la lista', async () => {
    const fetchMock = mockApi();
    render(<IncidentList />);
    await screen.findByText('Sin sistema');
    await userEvent.selectOptions(screen.getByLabelText('Prioridad'), 'CRITICA');
    await waitFor(() => expect(incidentCalls(fetchMock)).toContain('/api/incidents?prioridad=CRITICA'));
  });

  it('combina varios filtros y vuelve a "Todos" sin enviar el parametro', async () => {
    const fetchMock = mockApi();
    render(<IncidentList />);
    await screen.findByText('Sin sistema');
    await screen.findByRole('option', { name: 'Luis Tecnico' });
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'ASIGNADO');
    await userEvent.selectOptions(screen.getByLabelText('Técnico'), '2');
    await waitFor(() => expect(incidentCalls(fetchMock)).toContain('/api/incidents?estado=ASIGNADO&tecnico_id=2'));
    await userEvent.selectOptions(screen.getByLabelText('Estado'), '');
    await waitFor(() => expect(incidentCalls(fetchMock).at(-1)).toBe('/api/incidents?tecnico_id=2'));
  });

  it('muestra mensaje cuando no hay resultados', async () => {
    mockApi([]);
    render(<IncidentList />);
    expect(await screen.findByText('No hay incidentes con esos filtros.')).toBeInTheDocument();
  });

  it('muestra un error accesible si la API falla', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    render(<IncidentList />);
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
  });
});
