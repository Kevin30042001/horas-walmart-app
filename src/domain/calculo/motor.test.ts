import { describe, expect, it } from 'vitest';
import { calcularJornada } from './motor';
import { calcularHoraBase, calcularMontos, sumarMontos } from './montos';
import { REGLAS_PAGO_DEFECTO } from './reglasPagoDefecto';
import type { EntradaJornada, ParametrosTurno } from '../tipos';

function fecha(dia: number, hora: number, minuto = 0): Date {
  return new Date(2026, 0, dia, hora, minuto, 0, 0);
}

const DESPACHO: ParametrosTurno = { nombre: 'DESPACHO', horasSemanales: 39, diaInicioSemana: 0 };
const RECIBO: ParametrosTurno = { nombre: 'RECIBO', horasSemanales: 44, diaInicioSemana: 6 };

describe('calcularJornada - 5 casos obligatorios', () => {
  it('1) turno que cruza la medianoche, con extra nocturna al final', () => {
    // Despacho: entrada 20:00, receso 00:00-01:00, salida 05:00 (dia siguiente)
    const entrada: EntradaJornada = {
      fecha: '2026-01-05',
      entrada: fecha(5, 20, 0),
      salida: fecha(6, 5, 0),
      receso: { inicio: fecha(5, 23, 59) /* placeholder, se corrige abajo */, fin: fecha(6, 1, 0) },
      turno: DESPACHO,
    };
    // Receso real: 00:00 a 01:00 del dia 6
    entrada.receso = { inicio: fecha(6, 0, 0), fin: fecha(6, 1, 0) };

    const resultado = calcularJornada(entrada);

    expect(resultado.tipoJornadaLegal).toBe('nocturna');
    // 9h brutas - 1h receso = 8h = 480 min trabajados, todo nocturno
    expect(resultado.totalMinutosTrabajados).toBe(480);
    // Max ordinaria nocturna = 420 min -> 60 min de extra
    expect(resultado.desgloseMinutos.ordinariaNocturna).toBe(420);
    expect(resultado.desgloseMinutos.extraNocturna).toBe(60);
    expect(resultado.desgloseMinutos.ordinariaDiurna).toBe(0);
  });

  it('2) jornada mixta: el umbral de 3.5h nocturnas cambia el tope diario aplicable', () => {
    // Variante A: 03:00-06:00 nocturno (180min, <=210) + 06:00-10:00 diurno (240min) con
    // receso de 30min en bloque diurno -> nocturno 180min (no supera umbral) => jornada "diurna"
    const entradaA: EntradaJornada = {
      fecha: '2026-01-05',
      entrada: fecha(5, 3, 0),
      salida: fecha(5, 10, 0),
      receso: { inicio: fecha(5, 8, 0), fin: fecha(5, 8, 30) },
      turno: RECIBO,
    };
    const resultadoA = calcularJornada(entradaA);
    expect(resultadoA.tipoJornadaLegal).toBe('diurna');
    expect(resultadoA.totalMinutosTrabajados).toBe(390); // 420 brutos - 30 receso
    expect(resultadoA.desgloseMinutos.extraDiurna + resultadoA.desgloseMinutos.extraNocturna).toBe(0);

    // Variante B: entrada 1h mas temprano -> nocturno sube a 240min (>210) => jornada "nocturna",
    // tope baja a 420min y ahora SI hay 30min de extra (tomados del final, en diurno)
    const entradaB: EntradaJornada = {
      fecha: '2026-01-05',
      entrada: fecha(5, 2, 0),
      salida: fecha(5, 10, 0),
      receso: { inicio: fecha(5, 8, 0), fin: fecha(5, 8, 30) },
      turno: RECIBO,
    };
    const resultadoB = calcularJornada(entradaB);
    expect(resultadoB.tipoJornadaLegal).toBe('nocturna');
    expect(resultadoB.totalMinutosTrabajados).toBe(450); // 480 brutos - 30 receso
    expect(resultadoB.desgloseMinutos.ordinariaNocturna).toBe(240);
    expect(resultadoB.desgloseMinutos.ordinariaDiurna).toBe(180);
    expect(resultadoB.desgloseMinutos.extraDiurna).toBe(30);
    expect(resultadoB.desgloseMinutos.extraNocturna).toBe(0);
  });

  it('3) asueto nocturno con horas extra dentro del mismo asueto', () => {
    // Despacho en dia de asueto nacional: 20:00 a 05:00 (8h netas tras receso), igual que caso 1
    const entrada: EntradaJornada = {
      fecha: '2026-01-05',
      entrada: fecha(5, 20, 0),
      salida: fecha(6, 5, 0),
      receso: { inicio: fecha(6, 0, 0), fin: fecha(6, 1, 0) },
      esAsueto: true,
      turno: DESPACHO,
    };
    const resultado = calcularJornada(entrada);

    expect(resultado.desgloseMinutos.asuetoNocturna).toBe(420);
    expect(resultado.desgloseMinutos.asuetoExtraNocturna).toBe(60);
    // nada cae en las categorias "normales"
    expect(resultado.desgloseMinutos.ordinariaNocturna).toBe(0);
    expect(resultado.desgloseMinutos.extraNocturna).toBe(0);

    // Y el monto se calcula con los factores 2.5 / 5.0 de asueto nocturno
    const horaBase = calcularHoraBase(642);
    const detalle = calcularMontos(resultado.desgloseMinutos, horaBase, REGLAS_PAGO_DEFECTO);
    const lineaAsueto = detalle.find((d) => d.tipoHora === 'asuetoNocturna')!;
    const lineaAsuetoExtra = detalle.find((d) => d.tipoHora === 'asuetoExtraNocturna')!;
    expect(lineaAsueto.factor).toBe(2.5);
    expect(lineaAsuetoExtra.factor).toBe(5.0);
    expect(lineaAsuetoExtra.monto).toBeGreaterThan(0);
  });

  it('4) dia de descanso semanal laborado', () => {
    // Recibo libra domingo; aqui lo laboran: 10:00 a 19:00 (9h - 30min receso = 8.5h = 510min)
    const entrada: EntradaJornada = {
      fecha: '2026-01-04', // domingo
      entrada: fecha(4, 10, 0),
      salida: fecha(4, 19, 0),
      receso: { inicio: fecha(4, 14, 0), fin: fecha(4, 14, 30) },
      esDescansoSemanalLaborado: true,
      turno: RECIBO,
    };
    const resultado = calcularJornada(entrada);

    expect(resultado.totalMinutosTrabajados).toBe(510);
    // tope diurno 480min -> 480 van a descansoLaboradoDiurna, 30 a extraDiurna
    expect(resultado.desgloseMinutos.descansoLaboradoDiurna).toBe(480);
    expect(resultado.desgloseMinutos.extraDiurna).toBe(30);
    expect(resultado.desgloseMinutos.ordinariaDiurna).toBe(0);
  });

  it('5) cambio de turno a mitad de corte: cada jornada usa los parametros de SU propio turno', () => {
    const primeraSemana: EntradaJornada = {
      fecha: '2026-01-05',
      entrada: fecha(5, 20, 0),
      salida: fecha(6, 3, 0),
      receso: { inicio: fecha(6, 0, 0), fin: fecha(6, 1, 0) },
      turno: DESPACHO,
    };
    const segundaSemana: EntradaJornada = {
      fecha: '2026-01-20',
      entrada: fecha(20, 10, 0),
      salida: fecha(20, 19, 0),
      receso: { inicio: fecha(20, 14, 0), fin: fecha(20, 14, 30) },
      turno: RECIBO,
    };

    const resultado1 = calcularJornada(primeraSemana);
    const resultado2 = calcularJornada(segundaSemana);

    // El motor es "sin estado": cada llamada usa el turno que se le pasa, sin
    // arrastrar nada de la jornada anterior. Esto es lo que permite que un
    // corte con rotacion de turno a mitad de periodo calcule cada mitad bien.
    expect(resultado1.totalMinutosTrabajados).toBe(360); // 7h - 1h receso = 6h
    expect(resultado2.totalMinutosTrabajados).toBe(510); // 9h - 30min receso
    expect(resultado1.desgloseMinutos.ordinariaNocturna).toBeGreaterThan(0);
    expect(resultado2.desgloseMinutos.ordinariaDiurna).toBeGreaterThan(0);
  });
});

describe('calcularJornada + calcularMontos - golden test contra boleta real', () => {
  it('reproduce (dentro del redondeo por linea) los montos de la boleta de ejemplo', () => {
    // Datos reales de la boleta: salario mensual 642, horas extra 200% = 1.45h,
    // extras 250% nocturnas = 0.85h, nocturnidad 25% = 13.98h.
    const horaBase = calcularHoraBase(642);
    expect(horaBase).toBeCloseTo(2.675, 3);

    const desglose = {
      ordinariaDiurna: 0,
      ordinariaNocturna: Math.round(13.98 * 60), // nocturnidad 25% -> va en ordinariaNocturna (factor 1.25 = base + 25%)
      extraDiurna: Math.round(1.45 * 60),
      extraNocturna: Math.round(0.85 * 60),
      asuetoDiurna: 0,
      asuetoNocturna: 0,
      asuetoExtraDiurna: 0,
      asuetoExtraNocturna: 0,
      descansoLaboradoDiurna: 0,
      descansoLaboradoNocturna: 0,
    };

    const detalle = calcularMontos(desglose, horaBase, REGLAS_PAGO_DEFECTO);
    const extraDiurna = detalle.find((d) => d.tipoHora === 'extraDiurna')!;
    const extraNocturna = detalle.find((d) => d.tipoHora === 'extraNocturna')!;

    // Boleta real: Horas Extras 200% = $7.76 ; Extras 250% Nocturnas = $5.68
    expect(extraDiurna.monto).toBeCloseTo(7.76, 1);
    expect(extraNocturna.monto).toBeCloseTo(5.68, 1);
    expect(sumarMontos(detalle)).toBeGreaterThan(0);
  });
});
