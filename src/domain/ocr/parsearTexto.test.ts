import { describe, expect, it } from 'vitest';
import { extraerFechaHoraDeTexto } from './parsearTexto';

describe('extraerFechaHoraDeTexto', () => {
  it('extrae fecha y hora en formato 24h con separador /', () => {
    const r = extraerFechaHoraDeTexto('ENTRADA 05/11/2026 20:03');
    expect(r.fecha).toBe('2026-11-05');
    expect(r.hora).toBe('20:03');
    expect(r.confianza).toBeGreaterThan(0.5);
  });

  it('extrae hora en formato AM/PM', () => {
    const r = extraerFechaHoraDeTexto('Marcacion: 7:15 pm del 05-11-2026');
    expect(r.hora).toBe('19:15');
    expect(r.fecha).toBe('2026-11-05');
  });

  it('convierte 12:00 am a 00:00 y 12:00 pm se queda en 12:00', () => {
    expect(extraerFechaHoraDeTexto('12:00 am').hora).toBe('00:00');
    expect(extraerFechaHoraDeTexto('12:00 pm').hora).toBe('12:00');
  });

  it('devuelve confianza baja si solo encuentra una de las dos partes', () => {
    const r = extraerFechaHoraDeTexto('texto ilegible 20:00 sin fecha');
    expect(r.fecha).toBeNull();
    expect(r.hora).toBe('20:00');
    expect(r.confianza).toBeLessThan(0.5);
  });

  it('devuelve confianza 0 si no reconoce nada util', () => {
    const r = extraerFechaHoraDeTexto('xxxxx ???');
    expect(r.fecha).toBeNull();
    expect(r.hora).toBeNull();
    expect(r.confianza).toBe(0);
  });
});
