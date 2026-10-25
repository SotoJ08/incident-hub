import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IncidentHistory from '../src/components/IncidentHistory.jsx';

const eventos = [
  { id: 1, incident_id: 7, tipo: 'COMENTARIO', detalle: 'Sigue sin encender', created_at: '2026-10-17T14:00:00.000Z', autor_id: 1, autor: 'Ana Solicitante' },
  { id: 2, incident_id: 7, tipo: 'ASIGNACION', detalle: 'Asignacion automatica a Luis Tecnico', created_at: '2026-10-17T14:05:00.000Z', autor_id: 1, autor: 'Ana Solicitante' },
  { id: 3, incident_id: 7, tipo: 'CAMBIO_ESTADO', detalle: 'ASIGNADO -> EN_PROCESO', created_at: '2026-10-17T14:10:00.000Z', autor_id: 2, autor: 'Luis Tecnico' },
];

// GET devuelve la lista actual; POST agrega un comentario a esa lista
function mockApi(initial = eventos, { postOk = true } = {}) {
  let lista = [...initial];
  const fetchMock = vi.fn(async (url, init) => {
    if (init?.method === 'POST') {
      if (!postOk) return { ok: false, status: 409, json: async () => ({ errors: ['no se puede comentar un incidente CERRADO'] }) };
      const body = JSON.parse(init.body);
      const nuevo = { id: lista.length + 1, incident_id: 7, tipo: 'COMENTARIO', detalle: body.comentario, created_at: '2026-10-17T15:00:00.000Z', autor_id: 4, autor: 'Admin TI' };
      lista = [...lista, nuevo];
      return { ok: true, status: 201, json: async () => nuevo };
    }
    return { ok: true, json: async () => lista };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const lecturas = (fetchMock) => fetchMock.mock.calls.filter((c) => (c[1]?.method ?? 'GET') === 'GET');

describe('IncidentHistory', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('lista los eventos en el orden recibido con tipo, autor y detalle', async () => {
    mockApi();
    render(<IncidentHistory incidentId={7} />);
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('Comentario')).toBeInTheDocument();
    expect(within(items[0]).getByText(/Ana Solicitante/)).toBeInTheDocument();
    expect(within(items[1]).getByText('Asignación')).toBeInTheDocument();
    expect(within(items[1]).getByText('Asignacion automatica a Luis Tecnico')).toBeInTheDocument();
    expect(within(items[2]).getByText('ASIGNADO -> EN_PROCESO')).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay actividad', async () => {
    mockApi([]);
    render(<IncidentHistory incidentId={7} />);
    expect(await screen.findByText('Sin actividad todavía.')).toBeInTheDocument();
  });

  it('agrega un comentario enviando solo el texto, limpia el campo y recarga el historial', async () => {
    const fetchMock = mockApi();
    render(<IncidentHistory incidentId={7} />);
    await screen.findAllByRole('listitem');
    const boton = screen.getByRole('button', { name: 'Comentar' });
    expect(boton).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Comentario'), '  Lo reviso mañana  ');
    await userEvent.click(boton);
    expect(await screen.findByText('Lo reviso mañana')).toBeInTheDocument();
    expect(screen.getByLabelText('Comentario')).toHaveValue('');
    const post = fetchMock.mock.calls.find((c) => c[1]?.method === 'POST');
    expect(post[0]).toBe('/api/incidents/7/comments');
    expect(JSON.parse(post[1].body)).toEqual({ comentario: 'Lo reviso mañana' });
  });

  it('un incidente cerrado muestra aviso en lugar del formulario', async () => {
    mockApi();
    render(<IncidentHistory incidentId={7} cerrado />);
    await screen.findAllByRole('listitem');
    expect(screen.queryByLabelText('Comentario')).not.toBeInTheDocument();
    expect(screen.getByText(/no admite comentarios/)).toBeInTheDocument();
  });

  it('muestra el error del servidor al comentar', async () => {
    mockApi(eventos, { postOk: false });
    render(<IncidentHistory incidentId={7} />);
    await screen.findAllByRole('listitem');
    await userEvent.type(screen.getByLabelText('Comentario'), 'tarde');
    await userEvent.click(screen.getByRole('button', { name: 'Comentar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CERRADO');
  });

  it('recarga el historial cuando cambia refreshKey', async () => {
    const fetchMock = mockApi();
    const { rerender } = render(<IncidentHistory incidentId={7} refreshKey="NUEVO-null" />);
    await screen.findAllByRole('listitem');
    expect(lecturas(fetchMock)).toHaveLength(1);
    rerender(<IncidentHistory incidentId={7} refreshKey="ASIGNADO-2" />);
    await waitFor(() => expect(lecturas(fetchMock)).toHaveLength(2));
  });
});
