import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../src/components/Dashboard.jsx';
import App from '../src/App.jsx';

const stats = {
  total: 5,
  abiertos: 4,
  cerrados: 1,
  criticos: 2,
  sin_asignar: 1,
  por_estado: { NUEVO: 1, ASIGNADO: 1, EN_PROCESO: 2, RESUELTO: 0, CERRADO: 1 },
  por_categoria: [
    { category_id: 1, nombre: 'Equipo de computo', total: 2 },
    { category_id: 2, nombre: 'Sistema Institucional', total: 3 },
  ],
  por_tecnico: [{ tecnico_id: 2, nombre: 'Luis Tecnico', total: 2 }],
};

function mockFetch(body = stats, ok = true) {
  const fetchMock = vi.fn(async (url) => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => (url.startsWith('/api/stats') ? body : []),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const kpi = (label) => screen.getByText(label).closest('.kpi');

describe('Dashboard', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('muestra los indicadores principales', async () => {
    mockFetch();
    render(<Dashboard />);
    await screen.findByText('Abiertos');
    expect(within(kpi('Abiertos')).getByText('4')).toBeInTheDocument();
    expect(within(kpi('Cerrados')).getByText('1')).toBeInTheDocument();
    expect(within(kpi('Críticos')).getByText('2')).toBeInTheDocument();
    expect(within(kpi('Sin asignar')).getByText('1')).toBeInTheDocument();
  });

  it('resalta los criticos solo cuando hay alguno', async () => {
    mockFetch({ ...stats, criticos: 0 });
    render(<Dashboard />);
    await screen.findByText('Abiertos');
    expect(kpi('Críticos')).not.toHaveClass('kpi-danger');
  });

  it('muestra la distribucion por estado, categoria y tecnico', async () => {
    mockFetch();
    render(<Dashboard />);
    const porCategoria = await screen.findByRole('region', { name: 'Por categoría' });
    expect(within(porCategoria).getByText('Sistema Institucional')).toBeInTheDocument();
    expect(within(porCategoria).getByText('3')).toBeInTheDocument();
    const porEstado = screen.getByRole('region', { name: 'Por estado' });
    expect(within(porEstado).getAllByRole('listitem')).toHaveLength(5);
    const porTecnico = screen.getByRole('region', { name: 'Por técnico' });
    expect(within(porTecnico).getByText('Luis Tecnico')).toBeInTheDocument();
  });

  it('el ancho de cada barra es proporcional al mayor valor', async () => {
    mockFetch();
    const { container } = render(<Dashboard />);
    await screen.findByText('Abiertos');
    const porCategoria = within(await screen.findByRole('region', { name: 'Por categoría' }));
    const fills = container.querySelectorAll('[aria-label="Por categoría"] .bar-fill');
    expect(fills[1].style.width).toBe('100%');
    expect(parseFloat(fills[0].style.width)).toBeCloseTo(66.67, 1);
    expect(porCategoria.getAllByRole('listitem')).toHaveLength(2);
  });

  it('muestra mensaje si una lista no tiene datos', async () => {
    mockFetch({ ...stats, por_tecnico: [] });
    render(<Dashboard />);
    const porTecnico = await screen.findByRole('region', { name: 'Por técnico' });
    expect(within(porTecnico).getByText('Sin datos.')).toBeInTheDocument();
  });

  it('muestra un error accesible si la API falla', async () => {
    mockFetch({}, false);
    render(<Dashboard />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('App', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('permite cambiar entre Incidentes y Dashboard', async () => {
    const fetchMock = mockFetch();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Incidentes' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(await screen.findByText('Sin asignar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/stats')).toBe(true);
  });
});
