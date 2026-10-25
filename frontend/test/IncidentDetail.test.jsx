import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IncidentDetail from '../src/components/IncidentDetail.jsx';
import IncidentList from '../src/components/IncidentList.jsx';
import { WORKFLOW, ADMIN, TECNICO, SOLICITANTE, TECNICOS, CATEGORIAS } from './fixtures.js';

// Incidente de la categoria 1 (Equipo de computo, que atiende Luis, id 2)
const base = { id: 7, titulo: 'Laptop no enciende', descripcion: 'Sin energia', category_id: 1, prioridad: 'BAJA', estado: 'NUEVO', tecnico_id: null };
const otroTecnico = { id: 3, nombre: 'Marta Tecnica', rol: 'TECNICO', categorias: [1] };

// Las escrituras (PATCH) devuelven `response`; las lecturas del historial devuelven una lista vacia
function mockPatch(response, ok = true) {
  const fetchMock = vi.fn(async (url, init) => {
    if (init?.method === 'PATCH') return { ok, status: ok ? 200 : 409, json: async () => response };
    return { ok: true, json: async () => [] };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const lastCall = (fetchMock) => {
  const [url, init] = fetchMock.mock.calls.filter((c) => c[1]?.method === 'PATCH').at(-1);
  return { url, method: init.method, body: JSON.parse(init.body) };
};

const renderDetail = (incident = base, props = {}) => {
  const onUpdated = vi.fn();
  render(
    <IncidentDetail incident={incident} technicians={TECNICOS} workflow={WORKFLOW} user={ADMIN} onUpdated={onUpdated} onClose={() => {}} {...props} />
  );
  return onUpdated;
};

describe('IncidentDetail como administrador', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('asigna un tecnico enviando solo tecnico_id (el autor lo decide el backend)', async () => {
    const updated = { ...base, estado: 'ASIGNADO', tecnico_id: 2 };
    const fetchMock = mockPatch(updated);
    const onUpdated = renderDetail();
    const boton = screen.getByRole('button', { name: 'Asignar' });
    expect(boton).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Técnico'), '2');
    await userEvent.click(boton);
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
    expect(lastCall(fetchMock)).toEqual({ url: '/api/incidents/7/assign', method: 'PATCH', body: { tecnico_id: 2 } });
  });

  it('solo ofrece los tecnicos que atienden la categoria del incidente', () => {
    renderDetail();
    const opciones = screen.getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toContain('Luis Tecnico'); // atiende la categoria 1
    expect(opciones).not.toContain('Marta Tecnica'); // atiende 2 y 3
    expect(opciones).not.toContain('Carlos Teleco'); // atiende 4
  });

  it('avisa si ningun tecnico atiende la categoria', () => {
    renderDetail({ ...base, category_id: 5 });
    expect(screen.getByText('Ningún técnico atiende la categoría de este incidente.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Técnico')).not.toBeInTheDocument();
  });

  it('sin tecnico no deja cambiar el estado y avisa', () => {
    renderDetail();
    expect(screen.getByRole('button', { name: 'ASIGNADO' })).toBeDisabled();
    expect(screen.getByText('Asigne un técnico primero.')).toBeInTheDocument();
  });

  it('ofrece solo las transiciones permitidas y envia el estado elegido', async () => {
    const asignado = { ...base, estado: 'ASIGNADO', tecnico_id: 2 };
    const fetchMock = mockPatch({ ...asignado, estado: 'EN_PROCESO' });
    const onUpdated = renderDetail(asignado, { technicians: [...TECNICOS, otroTecnico] });
    expect(screen.queryByRole('button', { name: 'CERRADO' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reasignar' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'EN_PROCESO' }));
    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    expect(lastCall(fetchMock)).toEqual({ url: '/api/incidents/7/status', method: 'PATCH', body: { estado: 'EN_PROCESO' } });
  });

  it('un incidente RESUELTO puede cerrarse o reabrirse pero ya no asignarse', () => {
    renderDetail({ ...base, estado: 'RESUELTO', tecnico_id: 2 });
    expect(screen.getByRole('button', { name: 'CERRADO' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'EN_PROCESO' })).toBeEnabled();
    expect(screen.queryByLabelText('Técnico')).not.toBeInTheDocument();
  });

  it('sin las reglas del backend no ofrece acciones y lo indica', () => {
    renderDetail({ ...base, estado: 'ASIGNADO', tecnico_id: 2 }, { workflow: null });
    expect(screen.getByText('Cargando reglas del flujo…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'EN_PROCESO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reasignar' })).not.toBeInTheDocument();
  });

  it('usa las transiciones recibidas del backend, no una copia local', () => {
    const custom = { ...WORKFLOW, transiciones: { ...WORKFLOW.transiciones, NUEVO: ['EN_PROCESO'] } };
    renderDetail({ ...base, tecnico_id: 2 }, { workflow: custom });
    expect(screen.getByRole('button', { name: 'EN_PROCESO' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ASIGNADO' })).not.toBeInTheDocument();
  });

  it('un incidente CERRADO no ofrece acciones', () => {
    renderDetail({ ...base, estado: 'CERRADO', tecnico_id: 2 });
    expect(screen.getByText(/no admite más cambios/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Asignar|Reasignar|EN_PROCESO/ })).not.toBeInTheDocument();
  });

  it('muestra el error del servidor y no notifica actualizacion', async () => {
    mockPatch({ errors: ['transicion invalida: ASIGNADO -> CERRADO'] }, false);
    const onUpdated = renderDetail({ ...base, estado: 'ASIGNADO', tecnico_id: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'EN_PROCESO' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('transicion invalida');
    expect(onUpdated).not.toHaveBeenCalled();
  });
});

describe('IncidentDetail segun el rol', () => {
  beforeEach(() => { vi.unstubAllGlobals(); mockPatch({}); });

  const asignadoALuis = { ...base, estado: 'ASIGNADO', tecnico_id: 2 };

  it('el tecnico asignado cambia el estado pero no puede asignar', () => {
    renderDetail(asignadoALuis, { user: TECNICO });
    expect(screen.getByRole('button', { name: 'EN_PROCESO' })).toBeEnabled();
    expect(screen.queryByLabelText('Técnico')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Asignar|Reasignar/ })).not.toBeInTheDocument();
  });

  it('un tecnico que ve el incidente pero no lo tiene asignado no puede cambiar el estado', () => {
    renderDetail({ ...asignadoALuis, tecnico_id: 3 }, { user: TECNICO });
    expect(screen.queryByRole('button', { name: 'EN_PROCESO' })).not.toBeInTheDocument();
    expect(screen.getByText('Solo un administrador o el técnico asignado puede cambiar el estado.')).toBeInTheDocument();
  });

  it('el solicitante solo ve el incidente y su historial: sin asignar ni cambiar estado', () => {
    renderDetail(asignadoALuis, { user: SOLICITANTE });
    expect(screen.queryByRole('button', { name: /Asignar|Reasignar|EN_PROCESO/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Técnico')).not.toBeInTheDocument();
    expect(screen.getByText('Solo un administrador o el técnico asignado puede cambiar el estado.')).toBeInTheDocument();
    expect(screen.getByLabelText('Comentario')).toBeInTheDocument(); // si puede comentar
  });
});

describe('IncidentList con detalle', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('abre el detalle y refleja el cambio de estado en la tabla', async () => {
    const inc = { ...base, estado: 'ASIGNADO', tecnico_id: 2 };
    const fetchMock = vi.fn(async (url, init) => {
      if (init?.method === 'PATCH') return { ok: true, json: async () => ({ ...inc, estado: 'EN_PROCESO' }) };
      const body = url.startsWith('/api/categories') ? CATEGORIAS
        : url.startsWith('/api/users') ? TECNICOS
        : url.startsWith('/api/workflow') ? WORKFLOW
        : url.includes('/events') ? [] : [inc];
      return { ok: true, json: async () => body };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<IncidentList user={ADMIN} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ver incidente 7' }));
    expect(screen.getByRole('complementary', { name: 'Incidente 7' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'EN_PROCESO' }));
    await waitFor(() => expect(screen.getByText('Estado actual:').closest('p')).toHaveTextContent('EN_PROCESO'));
    expect(screen.getByRole('cell', { name: 'EN_PROCESO' })).toBeInTheDocument();
  });
});
