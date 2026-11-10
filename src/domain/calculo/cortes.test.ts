import { describe, expect, it } from 'vitest';
import { elegirCorteDelProximoPago, generarCortes, REGLA_CORTES_15_DIAS, REGLA_CORTES_WALMART } from './cortes';

describe('generarCortes - calendario de Walmart (pagos 14 y 28)', () => {
  it('pago del 14: del 20 del mes anterior al 4; pago del 28: del 5 al 19', () => {
    const periodos = generarCortes(new Date(2026, 9, 1), new Date(2026, 10, 30), REGLA_CORTES_WALMART);
    expect(periodos).toEqual([
      { fechaInicio: '2026-09-20', fechaCorte: '2026-10-04', fechaPago: '2026-10-14' },
      { fechaInicio: '2026-10-05', fechaCorte: '2026-10-19', fechaPago: '2026-10-28' },
      { fechaInicio: '2026-10-20', fechaCorte: '2026-11-04', fechaPago: '2026-11-14' },
      { fechaInicio: '2026-11-05', fechaCorte: '2026-11-19', fechaPago: '2026-11-28' },
      { fechaInicio: '2026-11-20', fechaCorte: '2026-12-04', fechaPago: '2026-12-14' },
    ]);
  });

  it('el periodo de la captura del sistema (20/10 al 04/11) se paga el 14/11', () => {
    const p = generarCortes(new Date(2026, 9, 25), new Date(2026, 9, 25), REGLA_CORTES_WALMART);
    expect(p).toEqual([{ fechaInicio: '2026-10-20', fechaCorte: '2026-11-04', fechaPago: '2026-11-14' }]);
  });

  it('cruza el cambio de anio (20/12 al 04/01, pago 14/01)', () => {
    const p = generarCortes(new Date(2026, 11, 25), new Date(2026, 11, 26), REGLA_CORTES_WALMART);
    expect(p).toEqual([{ fechaInicio: '2026-12-20', fechaCorte: '2027-01-04', fechaPago: '2027-01-14' }]);
  });

  it('dias configurables: corte el 5 y el 18', () => {
    const p = generarCortes(new Date(2026, 0, 10), new Date(2026, 0, 10), {
      cortes: [
        { diaCorte: 5, diaPago: 14 },
        { diaCorte: 18, diaPago: 28 },
      ],
    });
    expect(p).toEqual([{ fechaInicio: '2026-01-06', fechaCorte: '2026-01-18', fechaPago: '2026-01-28' }]);
  });

  it('febrero: el pago del 28 existe y un corte el 30 se ajusta al ultimo dia', () => {
    const p = generarCortes(new Date(2026, 1, 10), new Date(2026, 1, 10), {
      cortes: [
        { diaCorte: 15, diaPago: 30 },
        { diaCorte: 30, diaPago: 15 },
      ],
    });
    expect(p).toEqual([{ fechaInicio: '2026-01-31', fechaCorte: '2026-02-15', fechaPago: '2026-02-28' }]);
  });
});

describe('cortes de 15 dias seguidos (como los explico RRHH)', () => {
  const regla = REGLA_CORTES_15_DIAS;

  it('desde el 5: 5-19, luego 20 al 3 (octubre tiene 31 dias), luego 4-18...', () => {
    const p = generarCortes(new Date(2026, 9, 5), new Date(2026, 11, 20), regla);
    expect(p.map((x) => [x.fechaInicio, x.fechaCorte])).toEqual([
      ['2026-10-05', '2026-10-19'],
      ['2026-10-20', '2026-11-03'],
      ['2026-11-04', '2026-11-18'],
      ['2026-11-19', '2026-12-03'],
      ['2026-12-04', '2026-12-18'],
      ['2026-12-19', '2027-01-02'],
    ]);
  });

  it('cada corte dura exactamente 15 dias', () => {
    const p = generarCortes(new Date(2026, 0, 1), new Date(2027, 11, 31), regla);
    for (const x of p) {
      const dias = (new Date(x.fechaCorte + 'T00:00').getTime() - new Date(x.fechaInicio + 'T00:00').getTime()) / 86_400_000 + 1;
      expect(dias).toBe(15);
    }
  });

  it('se paga el siguiente 14 o 28 (con al menos 7 dias despues del corte)', () => {
    const p = generarCortes(new Date(2026, 9, 5), new Date(2026, 11, 20), regla);
    expect(p.map((x) => x.fechaPago)).toEqual(['2026-10-28', '2026-11-14', '2026-11-28', '2026-12-14', '2026-12-28', '2027-01-14']);
  });

  it('tambien genera hacia atras de la fecha de referencia (cortes encadenados)', () => {
    const p = generarCortes(new Date(2026, 8, 25), new Date(2026, 8, 25), regla);
    expect(p).toEqual([{ fechaInicio: '2026-09-20', fechaCorte: '2026-10-04', fechaPago: '2026-10-14' }]);
  });

  it('de oct-2026 a dic-2027: ningun pago se repite y siempre cae en 14 o 28', () => {
    // Con 15 dias exactos los cortes se corren ~5 dias por anio; Walmart reajusta
    // de vez en cuando (por eso cada corte se puede editar a mano).
    const p = generarCortes(new Date(2026, 9, 5), new Date(2027, 11, 31), regla);
    expect(new Set(p.map((x) => x.fechaPago)).size).toBe(p.length);
    expect(p.every((x) => ['14', '28'].includes(x.fechaPago.slice(8)))).toBe(true);
  });
});

describe('elegirCorteDelProximoPago', () => {
  const cortes = [
    { id: 1, fechaInicio: '2026-10-05', fechaCorte: '2026-10-19', fechaPago: '2026-10-28' },
    { id: 2, fechaInicio: '2026-10-20', fechaCorte: '2026-11-04', fechaPago: '2026-11-14' },
    { id: 3, fechaInicio: '2026-11-05', fechaCorte: '2026-11-19', fechaPago: '2026-11-28' },
  ];

  it('el 10/11 el proximo pago es el del 14/11 (corte 20/10 - 04/11), no el corte en curso', () => {
    expect(elegirCorteDelProximoPago(cortes, '2026-11-10')?.id).toBe(2);
  });

  it('el mismo dia de pago todavia cuenta como proximo pago', () => {
    expect(elegirCorteDelProximoPago(cortes, '2026-11-14')?.id).toBe(2);
  });

  it('pasado el 14/11, el proximo es el del 28/11', () => {
    expect(elegirCorteDelProximoPago(cortes, '2026-11-15')?.id).toBe(3);
  });

  it('si ya se pagaron todos, devuelve el ultimo', () => {
    expect(elegirCorteDelProximoPago(cortes, '2027-01-01')?.id).toBe(3);
  });
});
