import { describe, expect, it } from 'vitest';
import { clasificarDiurnoNocturno } from './segmentos';

function fecha(dia: number, hora: number, minuto = 0): Date {
  return new Date(2026, 0, dia, hora, minuto, 0, 0);
}

describe('clasificarDiurnoNocturno', () => {
  it('clasifica una jornada 100% diurna (10:00 a 14:00)', () => {
    const r = clasificarDiurnoNocturno(fecha(5, 10, 0), fecha(5, 14, 0));
    expect(r.diurnoMin).toBe(240);
    expect(r.nocturnoMin).toBe(0);
  });

  it('clasifica una jornada 100% nocturna sin cruzar medianoche (20:00 a 23:00)', () => {
    const r = clasificarDiurnoNocturno(fecha(5, 20, 0), fecha(5, 23, 0));
    expect(r.diurnoMin).toBe(0);
    expect(r.nocturnoMin).toBe(180);
  });

  it('CASO OBLIGATORIO: turno que cruza la medianoche (entrada 20:00 dia 5, salida 04:00 dia 6)', () => {
    const r = clasificarDiurnoNocturno(fecha(5, 20, 0), fecha(6, 4, 0));
    // 20:00 -> 00:00 (4h) + 00:00 -> 04:00 (4h) = 8h, todo nocturno (19:00-06:00)
    expect(r.nocturnoMin).toBe(480);
    expect(r.diurnoMin).toBe(0);
  });

  it('jornada mixta: cruza de nocturno a diurno (entrada 04:00, salida 08:00)', () => {
    const r = clasificarDiurnoNocturno(fecha(5, 4, 0), fecha(5, 8, 0));
    expect(r.nocturnoMin).toBe(120); // 04:00-06:00
    expect(r.diurnoMin).toBe(120); // 06:00-08:00
  });

  it('descuenta el receso exacto del total', () => {
    const receso = { inicio: fecha(5, 12, 0), fin: fecha(5, 13, 0) };
    const r = clasificarDiurnoNocturno(fecha(5, 10, 0), fecha(5, 14, 0), [receso]);
    expect(r.diurnoMin).toBe(180); // 240 - 60 de receso
  });

  it('receso que cae justo en el cruce diurno/nocturno tambien se descuenta bien', () => {
    // Despacho: entrada 20:00, receso 00:00-01:00, salida 05:00 (todo nocturno)
    const receso = { inicio: fecha(5, 23, 30), fin: fecha(6, 0, 30) };
    const r = clasificarDiurnoNocturno(fecha(5, 20, 0), fecha(6, 5, 0), [receso]);
    const totalBruto = 9 * 60; // 20:00 a 05:00 = 9h
    expect(r.nocturnoMin).toBe(totalBruto - 60);
    expect(r.diurnoMin).toBe(0);
  });

  it('lanza error si la salida es anterior o igual a la entrada', () => {
    expect(() => clasificarDiurnoNocturno(fecha(5, 10, 0), fecha(5, 10, 0))).toThrow();
    expect(() => clasificarDiurnoNocturno(fecha(5, 10, 0), fecha(5, 9, 0))).toThrow();
  });
});
