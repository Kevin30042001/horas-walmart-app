import { describe, expect, it } from 'vitest';
import { anclarHorario, minutosProgramados, minutosProgramadosSemana } from './ventana';
import { HORARIO_DESPACHO, HORARIO_RECIBO } from './horarioReal';

describe('horario real (fuente de verdad)', () => {
  it('Despacho suma exactamente 39 h semanales', () => {
    expect(minutosProgramadosSemana(HORARIO_DESPACHO)).toBe(39 * 60);
  });

  it('Recibo suma exactamente 44 h semanales', () => {
    expect(minutosProgramadosSemana(HORARIO_RECIBO)).toBe(44 * 60);
  });

  it('cada dia de Despacho coincide con la tabla (6,5,6,7,7,8)', () => {
    expect(HORARIO_DESPACHO.map((h) => minutosProgramados(h) / 60)).toEqual([6, 5, 6, 7, 7, 8]);
  });

  it('cada dia de Recibo coincide con la tabla (sab 4, lun 7, mar 8, mie 8, jue 9, vie 8)', () => {
    expect(HORARIO_RECIBO.map((h) => minutosProgramados(h) / 60)).toEqual([4, 7, 8, 8, 9, 8]);
  });
});

describe('anclarHorario', () => {
  it('lunes de Despacho: 21:00 lun -> 03:00 mar, receso 00:00-01:00 del MARTES', () => {
    const v = anclarHorario('2026-01-05', HORARIO_DESPACHO[1]!);
    expect(v.inicio).toEqual(new Date(2026, 0, 5, 21, 0));
    expect(v.fin).toEqual(new Date(2026, 0, 6, 3, 0));
    expect(v.receso).toEqual({ inicio: new Date(2026, 0, 6, 0, 0), fin: new Date(2026, 0, 6, 1, 0) });
  });

  it('sabado de Recibo: 14:00-18:00 mismo dia y sin receso', () => {
    const v = anclarHorario('2026-01-10', HORARIO_RECIBO[0]!);
    expect(v.inicio).toEqual(new Date(2026, 0, 10, 14, 0));
    expect(v.fin).toEqual(new Date(2026, 0, 10, 18, 0));
    expect(v.receso).toBeNull();
  });
});
