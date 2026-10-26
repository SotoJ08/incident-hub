import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IncidentList from '../src/components/IncidentList.jsx';
import { WORKFLOW, ADMIN, TECNICO, SOLICITANTE, TECNICOS, CATEGORIAS } from './fixtures.js';

const incidents = [
  { id: 2, titulo: 'Sin sistema', category_id: 2, prioridad: 'CRITICA', estado: 'ASIGNADO', tecnico_id: 2 },
  { id: 1, titulo: 'Laptop no enciende', category_id: 1, prioridad: 'BAJA', estado: 'NUEVO', tecnico_id: null },
];

function mockApi(listResponse = incidents) {
  const fetchMock = vi.fn(async (url) => {
    const body = url.startsWith('/api/categories') ? CATEGORIAS
      : url.startsWith('/api/users') ? TECNICOS
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
    render(<IncidentList user={ADMIN} />);
    expect(await screen.findByText('Laptop no enciende')).toBeInTheDocument();
    expect(screen.getByText('Sin sistema')).toBeInTheDocument();
    expect(await screen.findByText('Luis Tecnico', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
  });

  it('indica el alcance de lo que se ve segun el rol', async () => {
    mockApi();
    const { unmount } = render(<IncidentList user={ADMIN} />);
    expect(await screen.findByText('Todos los incidentes')).toBeInTheDocument();
    unmount();
    const t = render(<IncidentList user={TECNICO} />);
    expect(await screen.findByText('Incidentes de las categorías que atiende')).toBeInTheDocument();
    t.unmount();
    render(<IncidentList user={SOLICITANTE} />);
    expect(await screen.findByText('Sus incidentes')).toBeInTheDocument();
  });

  it('pide la lista sin filtros al cargar', async () => {
    const fetchMock = mockApi();
    render(<IncidentList user={ADMIN} />);
    await screen.findByText('Sin sistema');
    expect(incidentCalls(fetchMock)[0]).toBe('/api/incidents');
  });

  it('envia el filtro elegido al backend y recarga la lista', async () => {
    const fetchMock = mockApi();
    render(<IncidentList user={ADMIN} />);
    await screen.findByText('Sin sistema');
    await userEvent.selectOptions(screen.getByLabelText('Prioridad'), 'CRITICA');
    await waitFor(() => expect(incidentCalls(fetchMock)).toContain('/api/incidents?prioridad=CRITICA'));
  });

  it('combina varios filtros y vuelve a "Todos" sin enviar el parametro', async () => {
    const fetchMock = mockApi();
    render(<IncidentList user={ADMIN} />);
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
    render(<IncidentList user={SOLICITANTE} />);
    expect(await screen.findByText('No hay incidentes para mostrar.')).toBeInTheDocument();
  });

  it('muestra un error accesible si la API falla', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    render(<IncidentList user={ADMIN} />);
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
  });
});
