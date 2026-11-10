import { describe, expect, it } from 'vitest';
import { construirMarcasDiaPasado, resolverFechaJornada } from './edicionJornada';

function f(dia: number, hora: number, minuto = 0): Date {
  return new Date(2026, 0, dia, hora, minuto, 0, 0);
}

describe('agregar un dia pasado', () => {
  it('Despacho: entrada 21:00 y salida 05:11 -> la salida cae al dia siguiente', () => {
    const marcas = construirMarcasDiaPasado({ fecha: '2026-01-06', entrada: '21:00', salida: '05:11' });
    expect(marcas).toEqual([
      { tipoEvento: 'entrada', horaReal: f(6, 21) },
      { tipoEvento: 'salida', horaReal: f(7, 5, 11) },
    ]);
  });

  it('con receso 00:00-01:00, el receso se ancla despues de la entrada (madrugada siguiente)', () => {
    const marcas = construirMarcasDiaPasado({
      fecha: '2026-01-06',
      entrada: '21:00',
      salida: '04:00',
      receso: { inicio: '00:00', fin: '01:00' },
    });
    expect(marcas.map((m) => m.tipoEvento)).toEqual(['entrada', 'inicioReceso', 'finReceso', 'salida']);
    expect(marcas[1]!.horaReal).toEqual(f(7, 0));
    expect(marcas[2]!.horaReal).toEqual(f(7, 1));
  });

  it('Recibo: 14:00 a 18:00 el mismo dia', () => {
    const marcas = construirMarcasDiaPasado({ fecha: '2026-01-10', entrada: '14:00', salida: '18:00' });
    expect(marcas[1]!.horaReal).toEqual(f(10, 18));
  });

  it('rechaza una salida igual a la entrada', () => {
    expect(() => construirMarcasDiaPasado({ fecha: '2026-01-10', entrada: '14:00', salida: '14:00' })).toThrow();
  });
});

describe('foto con OCR: se asigna a la jornada de la fecha leida, no a hoy', () => {
  const entradas = [{ fecha: '2026-01-05', horaReal: f(5, 21) }];

  it('una ENTRADA leida pertenece a su propia fecha', () => {
    expect(resolverFechaJornada({ fechaHora: f(3, 21), accion: 'entrada', entradas })).toBe('2026-01-03');
  });

  it('una SALIDA a las 03:00 del martes pertenece a la jornada del LUNES (entrada 21:00)', () => {
    expect(resolverFechaJornada({ fechaHora: f(6, 3), accion: 'salida', entradas })).toBe('2026-01-05');
  });

  it('una salida sin entrada previa cercana se queda en su fecha leida', () => {
    expect(resolverFechaJornada({ fechaHora: f(9, 18), accion: 'salida', entradas })).toBe('2026-01-09');
  });

  it('un receso a las 00:00 del martes tambien es del lunes', () => {
    expect(resolverFechaJornada({ fechaHora: f(6, 0), accion: 'inicioReceso', entradas })).toBe('2026-01-05');
  });
});
