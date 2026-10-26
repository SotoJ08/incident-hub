import { describe, it, expect } from 'vitest';
import { puedeAsignar, puedeOperar, alcance, esAdmin, ROLES } from '../src/permissions.js';
import { ADMIN, TECNICO, SOLICITANTE } from './fixtures.js';

describe('permissions', () => {
  it('solo el administrador puede asignar', () => {
    expect(puedeAsignar(ADMIN)).toBe(true);
    expect(puedeAsignar(TECNICO)).toBe(false);
    expect(puedeAsignar(SOLICITANTE)).toBe(false);
    expect(puedeAsignar(null)).toBe(false);
  });

  it('puedeOperar: administrador, o tecnico asignado al incidente; nunca el solicitante', () => {
    expect(puedeOperar(ADMIN, { tecnico_id: null })).toBe(true);
    expect(puedeOperar(TECNICO, { tecnico_id: 2 })).toBe(true);
    expect(puedeOperar(TECNICO, { tecnico_id: 3 })).toBe(false);
    expect(puedeOperar(TECNICO, { tecnico_id: null })).toBe(false);
    expect(puedeOperar(SOLICITANTE, { tecnico_id: 1 })).toBe(false);
    expect(puedeOperar(undefined, { tecnico_id: 2 })).toBe(false);
  });

  it('alcance describe lo que ve cada rol', () => {
    expect(alcance(ADMIN)).toBe('Todos los incidentes');
    expect(alcance(TECNICO)).toBe('Incidentes de las categorías que atiende');
    expect(alcance(SOLICITANTE)).toBe('Sus incidentes');
  });

  it('esAdmin y nombres de rol para mostrar', () => {
    expect(esAdmin(ADMIN)).toBe(true);
    expect(esAdmin(TECNICO)).toBe(false);
    expect(ROLES).toEqual({ ADMIN: 'Administrador', TECNICO: 'Técnico', SOLICITANTE: 'Solicitante' });
  });
});
