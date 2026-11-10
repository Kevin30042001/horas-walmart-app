import { describe, expect, it } from 'vitest';
import { calcularJornada } from './motor';
import { anclarHorario } from '../horario/ventana';
import { HORARIO_DESPACHO, HORARIO_RECIBO } from '../horario/horarioReal';
import type { EntradaJornada, HorarioProgramado, Intervalo, ParametrosTurno } from '../tipos';

/** Enero 2026: el 4 es domingo, 5 lunes, 6 martes, 7 miercoles, 8 jueves, 9 viernes, 10 sabado. */
function f(dia: number, hora: number, minuto = 0): Date {
  return new Date(2026, 0, dia, hora, minuto, 0, 0);
}
function fechaIso(dia: number): string {
  return `2026-01-${String(dia).padStart(2, '0')}`;
}

const DESPACHO: ParametrosTurno = { nombre: 'DESPACHO', horasSemanales: 39, diaInicioSemana: 0 };
const RECIBO: ParametrosTurno = { nombre: 'RECIBO', horasSemanales: 44, diaInicioSemana: 6 };

function horarioDe(semana: (HorarioProgramado & { diaSemana: number })[], dia: number) {
  const diaSemana = new Date(2026, 0, dia).getDay();
  return semana.find((h) => h.diaSemana === diaSemana)!;
}

/** Arma la entrada del motor para un dia de Despacho, con su receso programado 00:00-01:00. */
function despacho(dia: number, entrada: Date, salida: Date, extra: Partial<EntradaJornada> = {}): EntradaJornada {
  const programado = anclarHorario(fechaIso(dia), horarioDe(HORARIO_DESPACHO, dia));
  return { fecha: fechaIso(dia), entrada, salida, receso: programado.receso, programado, turno: DESPACHO, ...extra };
}

function recibo(dia: number, entrada: Date, salida: Date, extra: Partial<EntradaJornada> = {}): EntradaJornada {
  const programado = anclarHorario(fechaIso(dia), horarioDe(HORARIO_RECIBO, dia));
  return { fecha: fechaIso(dia), entrada, salida, receso: null, programado, turno: RECIBO, ...extra };
}

function horasExtra(r: ReturnType<typeof calcularJornada>, tipo: 'diurno' | 'nocturno'): number {
  return r.tramos
    .filter((t) => t.categoria === 'extra' && t.periodo === tipo)
    .reduce((acc, t) => acc + Math.round((t.minutos / 60) * 100) / 100, 0);
}

describe('Fase 2 - extras = minutos FUERA de la ventana programada del dia', () => {
  it('Excel: martes de Despacho, salida programada 04:00, salgo 05:11 -> 1.18 h extra nocturna', () => {
    const r = calcularJornada(despacho(6, f(6, 21), f(7, 5, 11)));
    expect(r.desgloseMinutos.extraNocturna).toBe(71);
    expect(horasExtra(r, 'nocturno')).toBe(1.18);
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(360); // 6 h programadas
  });

  it('Excel: salida programada 06:00 (viernes), salgo 08:00 -> 2.00 h extra diurna', () => {
    const r = calcularJornada(despacho(9, f(9, 21), f(10, 8)));
    expect(r.desgloseMinutos.extraDiurna).toBe(120);
    expect(r.desgloseMinutos.extraNocturna).toBe(0);
    expect(horasExtra(r, 'diurno')).toBe(2);
  });

  it('Excel: extras de 05:00 a 08:00 -> 1.00 h nocturna + 2.00 h diurna (corte en las 06:00)', () => {
    const r = calcularJornada(despacho(7, f(7, 21), f(8, 8))); // miercoles, salida programada 05:00
    expect(horasExtra(r, 'nocturno')).toBe(1);
    expect(horasExtra(r, 'diurno')).toBe(2);
    const extras = r.tramos.filter((t) => t.categoria === 'extra');
    expect(extras.map((t) => [t.inicio.getHours(), t.fin.getHours(), t.periodo])).toEqual([
      [5, 6, 'nocturno'],
      [6, 8, 'diurno'],
    ]);
  });

  it('Excel: entro 19:00 a un turno programado a las 20:00 -> 1.00 h extra nocturna', () => {
    const r = calcularJornada(despacho(4, f(4, 19), f(5, 3))); // domingo 20:00-03:00
    expect(r.desgloseMinutos.extraNocturna).toBe(60);
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(360);
  });

  it('Excel (Recibo): salida programada 19:00, salgo 20:19 -> 1.32 h extra NOCTURNA', () => {
    const r = calcularJornada(recibo(5, f(5, 12), f(5, 20, 19))); // lunes 12:00-19:00
    expect(r.desgloseMinutos.extraNocturna).toBe(79);
    expect(horasExtra(r, 'nocturno')).toBe(1.32);
    expect(r.desgloseMinutos.ordinariaDiurna).toBe(420);
  });

  it('jueves de Recibo (9 h programadas) NO genera extra: es la jornada programada', () => {
    const r = calcularJornada(recibo(8, f(8, 10), f(8, 19)));
    expect(r.desgloseMinutos.ordinariaDiurna).toBe(540);
    expect(r.desgloseMinutos.extraDiurna + r.desgloseMinutos.extraNocturna).toBe(0);
    // el tope legal (8 h diurna) queda solo como alerta
    expect(r.advertencias.some((a) => a.includes('tope legal'))).toBe(true);
  });

  it('viernes de Despacho (8 h nocturnas programadas) NO genera extra', () => {
    const r = calcularJornada(despacho(9, f(9, 21), f(10, 6)));
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(480);
    expect(r.desgloseMinutos.extraNocturna + r.desgloseMinutos.extraDiurna).toBe(0);
  });

  it('lunes de Despacho (5 h): quedarme hasta las 03:30 SI es extra (antes no se contaba)', () => {
    const r = calcularJornada(despacho(5, f(5, 21), f(6, 3, 30)));
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(300);
    expect(r.desgloseMinutos.extraNocturna).toBe(30);
  });

  it('tolerancia: con 5 min, salir a las 04:03 no genera extra (y los 3 min se reportan ignorados)', () => {
    const r = calcularJornada(despacho(6, f(6, 21), f(7, 4, 3), { toleranciaMin: 5 }));
    expect(r.desgloseMinutos.extraNocturna).toBe(0);
    expect(r.minutosIgnoradosTolerancia).toBe(3);
  });

  it('tolerancia: si te pasas de la tolerancia cuenta TODO el tramo extra', () => {
    const r = calcularJornada(despacho(6, f(6, 21), f(7, 4, 10), { toleranciaMin: 5 }));
    expect(r.desgloseMinutos.extraNocturna).toBe(10);
  });

  it('llegada tarde / salida temprana: se informa el faltante, pero no se resta del pago', () => {
    const r = calcularJornada(despacho(6, f(6, 21, 30), f(7, 3, 30))); // programado 21:00-04:00 (6 h)
    expect(r.minutosFaltantes).toBe(60);
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(300);
    expect(r.desgloseMinutos.extraNocturna).toBe(0);
  });
});

describe('Fase 2 - dia libre y asueto', () => {
  it('dia libre (sin horario): todo cuenta como dia libre laborado', () => {
    const r = calcularJornada({
      fecha: fechaIso(10),
      entrada: f(10, 21),
      salida: f(11, 3),
      receso: null,
      programado: null,
      esDescansoSemanalLaborado: true,
      turno: DESPACHO,
    });
    expect(r.desgloseMinutos.descansoLaboradoNocturna).toBe(360);
    expect(r.desgloseMinutos.extraNocturna).toBe(0);
    expect(r.tramos.every((t) => t.categoria === 'ordinario')).toBe(true);
  });

  it('dia libre con mezcla diurno/nocturno se divide en las 06:00', () => {
    const r = calcularJornada({
      fecha: fechaIso(4),
      entrada: f(4, 0),
      salida: f(4, 8),
      programado: null,
      esDescansoSemanalLaborado: true,
      turno: DESPACHO,
    });
    expect(r.desgloseMinutos.descansoLaboradoNocturna).toBe(360);
    expect(r.desgloseMinutos.descansoLaboradoDiurna).toBe(120);
  });

  it('asueto nocturno con extras: ordinario dentro del horario, extra fuera', () => {
    const r = calcularJornada(despacho(6, f(6, 21), f(7, 5, 11), { esAsueto: true }));
    expect(r.desgloseMinutos.asuetoNocturna).toBe(360);
    expect(r.desgloseMinutos.asuetoExtraNocturna).toBe(71);
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(0);
    expect(r.desgloseMinutos.extraNocturna).toBe(0);
  });

  it('asueto en un dia sin horario: el tope legal diario es asueto y el resto asueto extra', () => {
    const r = calcularJornada({
      fecha: fechaIso(4),
      entrada: f(4, 8),
      salida: f(4, 18),
      programado: null,
      esAsueto: true,
      turno: RECIBO,
    });
    expect(r.desgloseMinutos.asuetoDiurna).toBe(480);
    expect(r.desgloseMinutos.asuetoExtraDiurna).toBe(120);
  });
});

describe('casos obligatorios del motor', () => {
  it('turno que cruza la medianoche: el receso 00:00-01:00 se descuenta y la jornada es del dia de entrada', () => {
    const r = calcularJornada(despacho(5, f(5, 21), f(6, 3)));
    expect(r.fecha).toBe('2026-01-05');
    expect(r.totalMinutosTrabajados).toBe(300);
    expect(r.tipoJornadaLegal).toBe('nocturna');
  });

  it('jornada mixta: >3.5 h nocturnas la vuelve nocturna (afecta solo la alerta legal)', () => {
    const programado = anclarHorario('2026-01-05', { horaEntrada: '02:00', horaSalida: '10:00', receso: null });
    const r = calcularJornada({
      fecha: '2026-01-05',
      entrada: f(5, 2),
      salida: f(5, 10),
      programado,
      turno: RECIBO,
    });
    expect(r.tipoJornadaLegal).toBe('nocturna');
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(240);
    expect(r.desgloseMinutos.ordinariaDiurna).toBe(240);
    expect(r.advertencias.some((a) => a.includes('tope legal'))).toBe(true); // 8 h > 7 h nocturna
  });

  it('cambio de turno a mitad de corte: cada jornada usa el horario de SU turno', () => {
    const r1 = calcularJornada(despacho(5, f(5, 21), f(6, 3)));
    const r2 = calcularJornada(recibo(20, f(20, 11), f(20, 19)));
    expect(r1.desgloseMinutos.ordinariaNocturna).toBe(300);
    expect(r2.desgloseMinutos.ordinariaDiurna).toBe(480);
  });

  it('receso real distinto al programado: se descuenta el real', () => {
    const real: Intervalo = { inicio: f(6, 0, 30), fin: f(6, 1, 0) };
    const r = calcularJornada(despacho(5, f(5, 21), f(6, 3), { receso: real }));
    expect(r.totalMinutosTrabajados).toBe(330);
  });
});

/**
 * Casos REALES del sistema de marcacion de Walmart (quincena 20/10 - 04/11/2026,
 * Despacho). Walmart aplica el asueto por DIA CALENDARIO (00:00-24:00): en un
 * turno nocturno solo las horas que caen en la fecha del asueto son asueto.
 * Codigos: REG/P0.25 = ordinaria nocturna, TE2 = extra diurna, TE2.5 = extra
 * nocturna, TE2.5_H = asueto nocturno, TE4.0 / TE5.0 = extras en asueto.
 */
describe('Walmart: asueto por dia calendario y codigos de su sistema', () => {
  const D = (mes: number, dia: number, h: number, m = 0) => new Date(2026, mes - 1, dia, h, m);
  function despachoReal(fecha: string, entrada: Date, salida: Date, extra: Partial<EntradaJornada> = {}): EntradaJornada {
    const [a, m, d] = fecha.split('-').map(Number);
    const diaSemana = new Date(a!, m! - 1, d!).getDay();
    const programado = anclarHorario(fecha, HORARIO_DESPACHO.find((h) => h.diaSemana === diaSemana)!);
    return { fecha, entrada, salida, receso: programado.receso, programado, turno: DESPACHO, toleranciaMin: 6, ...extra };
  }

  it('01/11 domingo con asueto el 2/11: antes de medianoche normal; despues, TE2.5_H / TE5.0 / TE4.0', () => {
    const r = calcularJornada(despachoReal('2026-11-01', D(11, 1, 20), D(11, 2, 6, 17), { fechasAsueto: ['2026-11-02'] }));
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(240); // 20:00-24:00 -> REG 4:00 / P0.25 4:00
    expect(r.desgloseMinutos.asuetoNocturna).toBe(120); // 01:00-03:00 -> TE2.5_H 2:00
    expect(r.desgloseMinutos.asuetoExtraNocturna).toBe(180); // 03:00-06:00 -> TE5.0
    expect(r.desgloseMinutos.asuetoExtraDiurna).toBe(17); // 06:00-06:17 -> TE4.0 0:17
  });

  it('02/11 lunes (asueto): 21:00-24:00 TE2.5_H 3:00; despues de medianoche REG 2:00 y TE2.5 2:37', () => {
    const r = calcularJornada(despachoReal('2026-11-02', D(11, 2, 20, 59), D(11, 3, 5, 37), { fechasAsueto: ['2026-11-02'] }));
    expect(r.desgloseMinutos.asuetoNocturna).toBe(180);
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(120);
    expect(r.desgloseMinutos.extraNocturna).toBe(157);
    expect(r.desgloseMinutos.asuetoExtraNocturna).toBe(0);
  });

  it('25/10 domingo, entrada 19:38 y salida 06:03: TE2.5 3:22 + TE2 0:03, REG 6:00', () => {
    const r = calcularJornada(despachoReal('2026-10-25', D(10, 25, 19, 38), D(10, 26, 6, 3)));
    expect(r.desgloseMinutos.extraNocturna).toBe(202);
    expect(r.desgloseMinutos.extraDiurna).toBe(3);
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(360);
  });

  it('22/10 jueves 20:54 -> 05:02: llegada anticipada 0:06 y salida tarde 0:02 NO son extra (tolerancia 6)', () => {
    const r = calcularJornada(despachoReal('2026-10-22', D(10, 22, 20, 54), D(10, 23, 5, 2)));
    expect(r.desgloseMinutos.extraNocturna + r.desgloseMinutos.extraDiurna).toBe(0);
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(420);
  });

  it('27/10 martes 20:59 -> 04:14: TE2.5 0:14', () => {
    const r = calcularJornada(despachoReal('2026-10-27', D(10, 27, 20, 59), D(10, 28, 4, 14)));
    expect(r.desgloseMinutos.extraNocturna).toBe(14);
  });

  it('20/10 martes 20:57 -> 05:00: TE2.5 1:00 y P0.25 6:00', () => {
    const r = calcularJornada(despachoReal('2026-10-20', D(10, 20, 20, 57), D(10, 21, 5, 0)));
    expect(r.desgloseMinutos.extraNocturna).toBe(60);
    expect(r.desgloseMinutos.ordinariaNocturna).toBe(360);
  });
});
