import { describe, expect, it } from 'vitest';
import { calcularJornada } from './motor';
import { horasNominaDeTramos, sumarHorasNomina } from './montos';
import { anclarHorario } from '../horario/ventana';
import { HORARIO_DESPACHO } from '../horario/horarioReal';
import { desgloseVacio } from './motor';
import { TODOS_LOS_TIPOS_HORA } from '../tipos';

/**
 * Quincena real del sistema de Walmart (20/10 al 04/11/2026, Despacho, asueto
 * el 2/11). Resumen de su sistema: TE2 0:03, TE2.5 10:00, TE2.5_H 5:00,
 * TE4.0 0:17, TE5.0 3:59.
 */
const MARCAS: [string, [number, number, number], [number, number, number]][] = [
  ['2026-10-20', [20, 20, 57], [21, 5, 0]],
  ['2026-10-21', [21, 20, 56], [22, 5, 1]],
  ['2026-10-22', [22, 20, 54], [23, 5, 2]],
  ['2026-10-23', [23, 20, 54], [24, 6, 4]],
  ['2026-10-25', [25, 19, 38], [26, 6, 3]],
  ['2026-10-26', [26, 21, 0], [27, 3, 53]],
  ['2026-10-27', [27, 20, 59], [28, 4, 14]],
  ['2026-10-28', [28, 20, 55], [29, 5, 1]],
  ['2026-10-29', [29, 20, 59], [30, 5, 37]],
  ['2026-10-30', [30, 21, 2], [31, 6, 1]],
  ['2026-11-01', [32, 19, 59], [33, 6, 17]],
  ['2026-11-02', [33, 20, 59], [34, 5, 37]],
  ['2026-11-03', [34, 20, 59], [35, 5, 17]],
  ['2026-11-04', [35, 21, 0], [36, 5, 3]],
];

/** Dia 32 = 1 de noviembre (new Date normaliza el desborde de octubre). */
const fecha = ([d, h, m]: [number, number, number]) => new Date(2026, 9, d, h, m);

function calcular(recesoPagadoEnAsueto: boolean) {
  return MARCAS.map(([f, ent, sal]) => {
    const [a, mes, d] = f.split('-').map(Number);
    const diaSemana = new Date(a!, mes! - 1, d!).getDay();
    const programado = anclarHorario(f, HORARIO_DESPACHO.find((x) => x.diaSemana === diaSemana)!);
    return calcularJornada({
      fecha: f,
      entrada: fecha(ent),
      salida: fecha(sal),
      receso: programado.receso,
      programado,
      fechasAsueto: ['2026-11-02'],
      toleranciaMin: 6,
      recesoPagadoEnAsueto,
      turno: { nombre: 'DESPACHO', horasSemanales: 39, diaInicioSemana: 0 },
    });
  });
}

describe('quincena real de Walmart (20/10 - 04/11)', () => {
  const jornadas = calcular(false);
  const minutos = desgloseVacio();
  for (const j of jornadas) for (const t of TODOS_LOS_TIPOS_HORA) minutos[t] += j.desgloseMinutos[t];
  const horas = sumarHorasNomina(jornadas.map((j) => horasNominaDeTramos(j.tramos)));

  it('TE2.5 (extras nocturnas) = 10:00, igual que Walmart', () => {
    expect(minutos.extraNocturna).toBe(600);
    expect(horas.extraNocturna).toBe(10);
  });

  it('TE2 (extras diurnas) = 0:03', () => {
    expect(minutos.extraDiurna).toBe(3);
  });

  it('TE2.5_H (asueto nocturno dentro del horario) = 5:00', () => {
    expect(minutos.asuetoNocturna).toBe(300);
  });

  it('TE4.0 (extra diurna en asueto) = 0:17', () => {
    expect(minutos.asuetoExtraDiurna).toBe(17);
  });

  it('sin pagar el receso del asueto: TE5.0 = 3:00', () => {
    expect(minutos.asuetoExtraNocturna).toBe(180);
  });

  it('pagando el receso del asueto (como Walmart): TE5.0 = 4:00 (Walmart 3:59: su comida empezo a las 00:01)', () => {
    const conReceso = desgloseVacio();
    for (const j of calcular(true)) for (const t of TODOS_LOS_TIPOS_HORA) conReceso[t] += j.desgloseMinutos[t];
    expect(conReceso.asuetoExtraNocturna).toBe(240);
    // el resto no cambia: el receso del 2/11 en la noche del lunes NO cae en asueto (es 00:00 del 3/11)
    expect(conReceso.extraNocturna).toBe(600);
    expect(conReceso.asuetoNocturna).toBe(300);
    expect(conReceso.ordinariaNocturna).toBe(minutos.ordinariaNocturna);
  });
});
