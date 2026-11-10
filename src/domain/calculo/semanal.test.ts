import { describe, expect, it } from 'vitest';
import { calcularExcesoSemanal, type JornadaParaTope } from './semanal';
import type { DesgloseMinutos, ParametrosTurno } from '../tipos';

const DESPACHO: ParametrosTurno = { nombre: 'DESPACHO', horasSemanales: 39, diaInicioSemana: 0 };
const RECIBO: ParametrosTurno = { nombre: 'RECIBO', horasSemanales: 44, diaInicioSemana: 6 };

function desgloseConOrdinarias(diurnas: number, nocturnas: number): DesgloseMinutos {
  return {
    ordinariaDiurna: diurnas,
    ordinariaNocturna: nocturnas,
    extraDiurna: 0,
    extraNocturna: 0,
    asuetoDiurna: 0,
    asuetoNocturna: 0,
    asuetoExtraDiurna: 0,
    asuetoExtraNocturna: 0,
    descansoLaboradoDiurna: 0,
    descansoLaboradoNocturna: 0,
  };
}

describe('calcularExcesoSemanal', () => {
  it('detecta exceso cuando la semana supera el tope del turno (44h Recibo)', () => {
    const jornadas: JornadaParaTope[] = [
      { fecha: '2026-01-03', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO }, // sabado
      { fecha: '2026-01-05', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-06', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-07', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-08', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-09', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
    ];
    // 6 dias x 8h = 48h > 44h de tope
    const resultado = calcularExcesoSemanal(jornadas);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.capMin).toBe(44 * 60);
    expect(resultado[0]!.totalOrdinarioMin).toBe(48 * 60);
    expect(resultado[0]!.excesoMin).toBe(4 * 60);
  });

  it('CASO OBLIGATORIO: cambio de turno a mitad de corte -- cada turno usa SU PROPIO tope, sin mezclarse', () => {
    const jornadas: JornadaParaTope[] = [
      // Primera quincena del corte: turno DESPACHO (tope 39h), semana completa de 6 dias x 6.5h = 39h exacto
      { fecha: '2026-01-04', desgloseMinutos: desgloseConOrdinarias(0, 390), turno: DESPACHO },
      { fecha: '2026-01-05', desgloseMinutos: desgloseConOrdinarias(0, 390), turno: DESPACHO },
      { fecha: '2026-01-06', desgloseMinutos: desgloseConOrdinarias(0, 390), turno: DESPACHO },
      { fecha: '2026-01-07', desgloseMinutos: desgloseConOrdinarias(0, 390), turno: DESPACHO },
      { fecha: '2026-01-08', desgloseMinutos: desgloseConOrdinarias(0, 390), turno: DESPACHO },
      { fecha: '2026-01-09', desgloseMinutos: desgloseConOrdinarias(0, 390), turno: DESPACHO },
      // A mitad de corte rota a RECIBO (tope 44h), su propia semana (sabado-viernes,
      // 17 al 23 de enero) con exceso
      { fecha: '2026-01-17', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-18', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-19', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-20', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-21', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-22', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
      { fecha: '2026-01-23', desgloseMinutos: desgloseConOrdinarias(480, 0), turno: RECIBO },
    ];

    const resultado = calcularExcesoSemanal(jornadas);

    const semanaDespacho = resultado.find((r) => r.turnoNombre === 'DESPACHO')!;
    const semanaRecibo = resultado.find((r) => r.turnoNombre === 'RECIBO')!;

    expect(semanaDespacho.capMin).toBe(39 * 60);
    expect(semanaDespacho.totalOrdinarioMin).toBe(39 * 60);
    expect(semanaDespacho.excesoMin).toBe(0); // justo en el tope, sin exceso

    expect(semanaRecibo.capMin).toBe(44 * 60);
    expect(semanaRecibo.totalOrdinarioMin).toBe(56 * 60); // 7 dias x 8h
    expect(semanaRecibo.excesoMin).toBe(12 * 60); // 56h - 44h

    // Y lo mas importante: NUNCA se suman minutos de un turno contra el tope del otro
    expect(resultado).toHaveLength(2);
  });
});
