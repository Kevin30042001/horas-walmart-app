import { describe, expect, it } from 'vitest';
import { sugerirCambioDeTurno } from './deteccionTurno';
import { HORARIO_DESPACHO, HORARIO_RECIBO } from '../domain/horario/horarioReal';

const turnos = [
  { id: 1, nombre: 'DESPACHO', horarioPorDia: HORARIO_DESPACHO },
  { id: 2, nombre: 'RECIBO', horarioPorDia: HORARIO_RECIBO },
];

describe('deteccion de cambio de turno por patron de marcacion', () => {
  it('entrada 21:05 un lunes con Despacho activo: no sugiere nada', () => {
    expect(sugerirCambioDeTurno(new Date(2026, 0, 5, 21, 5), 1, turnos)).toBeNull();
  });

  it('entrada 12:03 un lunes con Despacho activo: sugiere RECIBO', () => {
    expect(sugerirCambioDeTurno(new Date(2026, 0, 5, 12, 3), 1, turnos)?.nombre).toBe('RECIBO');
  });

  it('entrada 20:40 un martes con Recibo activo: sugiere DESPACHO', () => {
    expect(sugerirCambioDeTurno(new Date(2026, 0, 6, 20, 40), 2, turnos)?.nombre).toBe('DESPACHO');
  });

  it('entrada a una hora que no calza con ningun turno: nada', () => {
    expect(sugerirCambioDeTurno(new Date(2026, 0, 5, 4, 0), 1, turnos)).toBeNull();
  });
});
