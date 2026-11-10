import { describe, expect, it } from 'vitest';
import { calcularAlertas, type EntradaAlertas } from './alertas';
import { desgloseVacio } from '../domain/calculo/motor';

const base: EntradaAlertas = {
  ahora: new Date(2026, 0, 10, 12),
  horasMaxJornadaAbierta: 16,
  entradasSinSalida: [],
  jornadas: [],
  asuetos: [],
  excesosSemanales: [],
};

describe('alertas del Dashboard', () => {
  it('entrada sin salida de hace mas de 16 h = marcacion olvidada', () => {
    const r = calcularAlertas({ ...base, entradasSinSalida: [{ fecha: '2026-01-08', horaReal: new Date(2026, 0, 8, 21) }] });
    expect(r.map((a) => a.tipo)).toEqual(['sinSalida']);
  });

  it('una jornada abierta reciente NO es alerta', () => {
    const r = calcularAlertas({ ...base, entradasSinSalida: [{ fecha: '2026-01-10', horaReal: new Date(2026, 0, 10, 2) }] });
    expect(r).toHaveLength(0);
  });

  it('dia con extras sin foto', () => {
    const d = { ...desgloseVacio(), extraNocturna: 71 };
    const r = calcularAlertas({
      ...base,
      jornadas: [{ fecha: '2026-01-06', desgloseMinutos: d, esAsueto: false, esDescansoSemanalLaborado: false, tieneFoto: false }],
    });
    expect(r[0]!.tipo).toBe('extrasSinFoto');
  });

  it('con foto no hay alerta de evidencia', () => {
    const d = { ...desgloseVacio(), extraNocturna: 71 };
    const r = calcularAlertas({
      ...base,
      jornadas: [{ fecha: '2026-01-06', desgloseMinutos: d, esAsueto: false, esDescansoSemanalLaborado: false, tieneFoto: true }],
    });
    expect(r).toHaveLength(0);
  });

  it('varios dias sin foto se agrupan en una sola alerta', () => {
    const d = { ...desgloseVacio(), extraNocturna: 30 };
    const j = (fecha: string) => ({ fecha, desgloseMinutos: d, esAsueto: false, esDescansoSemanalLaborado: false, tieneFoto: false });
    const r = calcularAlertas({ ...base, jornadas: [j('2026-01-06'), j('2026-01-07'), j('2026-01-05')] });
    expect(r).toHaveLength(1);
    expect(r[0]!.titulo).toContain('3 dias');
    expect(r[0]!.detalle).toContain('05/01, 06/01, 07/01');
  });

  it('asueto en los proximos 7 dias', () => {
    const r = calcularAlertas({
      ...base,
      asuetos: [
        { fecha: '2026-01-15', nombre: 'Prueba' },
        { fecha: '2026-02-15', nombre: 'Lejano' },
      ],
    });
    expect(r.map((a) => a.titulo)).toEqual(['Asueto: Prueba']);
  });

  it('exceso sobre el tope semanal y diario', () => {
    const r = calcularAlertas({
      ...base,
      jornadas: [
        {
          fecha: '2026-01-08',
          desgloseMinutos: desgloseVacio(),
          esAsueto: false,
          esDescansoSemanalLaborado: false,
          advertencias: ['Supera el tope legal diario: 9.00 h > 8 h (jornada diurna).'],
          tieneFoto: false,
        },
      ],
      excesosSemanales: [{ inicioSemana: '2026-01-03', turnoNombre: 'RECIBO', excesoMin: 60, capMin: 2640 }],
    });
    expect(r.map((a) => a.tipo).sort()).toEqual(['topeLegal', 'topeSemanal']);
  });
});
