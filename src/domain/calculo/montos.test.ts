import { describe, expect, it } from 'vitest';
import {
  calcularHoraBase,
  calcularProyeccionPago,
  calcularSalarioCorte,
  horasNominaDeTramos,
  sumarHorasNomina,
} from './montos';
import { REGLAS_PAGO_DEFECTO } from './reglasPagoDefecto';
import { calcularJornada } from './motor';
import { anclarHorario } from '../horario/ventana';
import { HORARIO_DESPACHO } from '../horario/horarioReal';
import type { TipoHora, TramoJornada } from '../tipos';

function horas(parcial: Partial<Record<TipoHora, number>>): Record<TipoHora, number> {
  return {
    ordinariaDiurna: 0,
    ordinariaNocturna: 0,
    extraDiurna: 0,
    extraNocturna: 0,
    asuetoDiurna: 0,
    asuetoNocturna: 0,
    asuetoExtraDiurna: 0,
    asuetoExtraNocturna: 0,
    descansoLaboradoDiurna: 0,
    descansoLaboradoNocturna: 0,
    ...parcial,
  };
}

function tramo(minutos: number, tipoHora: TipoHora): TramoJornada {
  const inicio = new Date(2026, 0, 5, 4, 0);
  return {
    inicio,
    fin: new Date(inicio.getTime() + minutos * 60000),
    minutos,
    periodo: tipoHora.endsWith('Nocturna') ? 'nocturno' : 'diurno',
    categoria: tipoHora.includes('xtra') ? 'extra' : 'ordinario',
    tipoHora,
  };
}

describe('Fase 3 - golden test contra la boleta real', () => {
  const horaBase = calcularHoraBase(642);
  const pago = calcularProyeccionPago({
    horas: horas({ ordinariaNocturna: 13.98, extraDiurna: 1.45, extraNocturna: 0.85 }),
    horaBase,
    reglas: REGLAS_PAGO_DEFECTO,
    salarioCorte: calcularSalarioCorte(642, 'mitad', 15),
  });
  const linea = (t: TipoHora) => pago.lineas.find((l) => l.tipoHora === t)!;

  it('salario 642 -> hora base 2.675', () => {
    expect(horaBase).toBeCloseTo(2.675, 6);
  });

  it('extras al 200 % de 1.45 h = $7.76 (con su nombre de linea de la boleta)', () => {
    expect(linea('extraDiurna').monto).toBe(7.76);
    expect(linea('extraDiurna').nombreLinea).toBe('Horas Extras 200 %');
  });

  it('extras al 250 % de 0.85 h = $5.68', () => {
    expect(linea('extraNocturna').monto).toBe(5.68);
    expect(linea('extraNocturna').nombreLinea).toBe('Extras 250 % Nocturnas');
  });

  it('nocturnidad es una linea APARTE del 25 % (no la hora completa a 1.25): 13.98 h = $9.35', () => {
    expect(linea('ordinariaNocturna').modo).toBe('recargo');
    expect(linea('ordinariaNocturna').nombreLinea).toBe('Nocturnidad 25 %');
    expect(linea('ordinariaNocturna').monto).toBe(9.35);
  });

  it('el bruto INCLUYE el salario del corte (642 / 2 = 321)', () => {
    expect(pago.salarioCorte).toBe(321);
    expect(pago.bruto).toBe(343.79); // 321 + 9.35 + 7.76 + 5.68
  });

  it('las horas ordinarias diurnas no generan linea extra: ya estan en el salario', () => {
    expect(pago.lineas.find((l) => l.tipoHora === 'ordinariaDiurna')).toBeUndefined();
  });
});

describe('Fase 3 - asueto: se suma el RECARGO, no el dia completo dos veces', () => {
  it('6 h de asueto nocturno = recargo 1.00 + 0.25 sobre la hora base (no 2.5 x hora)', () => {
    const horaBase = calcularHoraBase(642);
    const pago = calcularProyeccionPago({
      horas: horas({ asuetoNocturna: 6, asuetoExtraNocturna: 1.18 }),
      horaBase,
      reglas: REGLAS_PAGO_DEFECTO,
      salarioCorte: 0,
    });
    const recargo = pago.lineas.find((l) => l.tipoHora === 'asuetoNocturna')!;
    expect(recargo.factor).toBe(1.25);
    expect(recargo.monto).toBe(20.06); // 6 x 2.675 x 1.25
    expect(pago.lineas.find((l) => l.tipoHora === 'asuetoExtraNocturna')!.monto).toBe(15.78); // 1.18 x 2.675 x 5
  });

  it('dia libre laborado: recargo configurable con indicador de dia compensatorio', () => {
    const pago = calcularProyeccionPago({
      horas: horas({ descansoLaboradoDiurna: 8 }),
      horaBase: 2.675,
      reglas: REGLAS_PAGO_DEFECTO,
      salarioCorte: 0,
    });
    const l = pago.lineas[0]!;
    expect(l.modo).toBe('recargo');
    expect(l.diaCompensatorio).toBe(true);
    expect(l.monto).toBe(21.4);
  });
});

describe('Fase 3 - redondeo como nomina: cada tramo a decimal y luego se suma', () => {
  it('dos tramos de 11 min = 0.18 + 0.18 = 0.36 (sumar minutos daria 22 min = 0.37)', () => {
    const r = horasNominaDeTramos([tramo(11, 'extraNocturna'), tramo(11, 'extraNocturna')]);
    expect(r.extraNocturna).toBe(0.36);
  });

  it('se suman los decimales de cada dia del corte', () => {
    const total = sumarHorasNomina([
      horasNominaDeTramos([tramo(71, 'extraNocturna')]), // 1.18
      horasNominaDeTramos([tramo(66, 'extraNocturna')]), // 1.10
      horasNominaDeTramos([tramo(44, 'extraNocturna')]), // 0.73
    ]);
    expect(total.extraNocturna).toBe(3.01);
  });

  it('jornada real: extras 05:00-08:00 se redondean por tramo (1.00 N + 2.00 D)', () => {
    const programado = anclarHorario('2026-01-07', HORARIO_DESPACHO[3]!);
    const r = calcularJornada({
      fecha: '2026-01-07',
      entrada: new Date(2026, 0, 7, 21),
      salida: new Date(2026, 0, 8, 8),
      receso: programado.receso,
      programado,
      turno: { nombre: 'DESPACHO', horasSemanales: 39, diaInicioSemana: 0 },
    });
    const h = horasNominaDeTramos(r.tramos);
    expect(h.extraNocturna).toBe(1);
    expect(h.extraDiurna).toBe(2);
    expect(h.ordinariaNocturna).toBe(7);
  });
});

describe('salario del corte', () => {
  it('mitad del mensual por defecto', () => {
    expect(calcularSalarioCorte(642, 'mitad', 13)).toBe(321);
  });
  it('proporcional a los dias del corte (mensual / 30 x dias)', () => {
    expect(calcularSalarioCorte(642, 'proporcional', 13)).toBe(278.2);
  });
});
