import { describe, expect, it } from 'vitest';
import { construirFo3106, TIPO_PREAUTORIZACION } from './fo3106';
import { calcularJornada } from '../calculo/motor';
import { anclarHorario } from '../horario/ventana';
import { HORARIO_DESPACHO } from '../horario/horarioReal';
import type { TramoJornada } from '../tipos';

const DESPACHO = { nombre: 'DESPACHO', horasSemanales: 39, diaInicioSemana: 0 };
const f = (dia: number, h: number, m = 0) => new Date(2026, 0, dia, h, m);

function tramosDespacho(fecha: string, dia: number, salida: Date, fechasAsueto: string[] = []): TramoJornada[] {
  const diaSemana = new Date(2026, 0, dia).getDay();
  const programado = anclarHorario(fecha, HORARIO_DESPACHO.find((h) => h.diaSemana === diaSemana)!);
  return calcularJornada({
    fecha,
    entrada: programado.inicio,
    salida,
    receso: programado.receso,
    programado,
    fechasAsueto,
    turno: DESPACHO,
  }).tramos;
}

const perfil = { gafete: '8923795', nombre: 'Asociado de prueba', division: 'LOG', departamento: 'PROTECCION DE ACTIVOS' };

describe('FO-3106 - Formato Pre-autorizacion de Horas Extras', () => {
  it('encabezado con division, departamento y periodo del corte', () => {
    const r = construirFo3106({ jornadas: [], perfil, tarea: 'Procesos QA', periodo: { inicio: '2026-08-06', fin: '2026-08-18' } });
    expect(r.encabezado.codigo).toBe('FO-3106');
    expect(r.encabezado.titulo).toBe('Formato Pre-autorizacion de Horas Extras, días libres y Feriados');
    expect(r.encabezado.periodo).toBe('06/08/2026 al 18/08/2026');
    expect(r.encabezado.division).toBe('LOG');
  });

  it('dia normal: una fila por tramo EXTRA (martes 04:00 -> 05:11 = 1.18 NOCTURNA)', () => {
    const r = construirFo3106({
      jornadas: [{ fecha: '2026-01-06', esAsueto: false, esDescansoSemanalLaborado: false, tramos: tramosDespacho('2026-01-06', 6, f(7, 5, 11)) }],
      perfil,
      tarea: 'Procesos QA',
      periodo: { inicio: '2026-01-01', fin: '2026-01-15' },
    });
    expect(r.filas).toEqual([
      {
        fecha: '06/01/2026',
        tipo: TIPO_PREAUTORIZACION.horasExtras,
        gafete: '8923795',
        asociado: 'Asociado de prueba',
        jornada: 'NOCTURNA',
        de: '04:00',
        a: '05:11',
        tiempoNomina: 1.18,
        tarea: 'Procesos QA',
      },
    ]);
    expect(r.total).toBe(1.18);
  });

  it('extras 05:00 -> 08:00 se dividen en NOCTURNA y DIURNA en las 06:00', () => {
    const r = construirFo3106({
      jornadas: [{ fecha: '2026-01-07', esAsueto: false, esDescansoSemanalLaborado: false, tramos: tramosDespacho('2026-01-07', 7, f(8, 8)) }],
      perfil,
      tarea: 'Procesos QA',
      periodo: { inicio: '2026-01-01', fin: '2026-01-15' },
    });
    expect(r.filas.map((x) => [x.jornada, x.de, x.a, x.tiempoNomina])).toEqual([
      ['NOCTURNA', '05:00', '06:00', 1],
      ['DIURNA', '06:00', '08:00', 2],
    ]);
    expect(r.total).toBe(3);
  });

  it('dia sin extras no genera filas', () => {
    const r = construirFo3106({
      jornadas: [{ fecha: '2026-01-05', esAsueto: false, esDescansoSemanalLaborado: false, tramos: tramosDespacho('2026-01-05', 5, f(6, 3)) }],
      perfil,
      tarea: 'x',
      periodo: { inicio: '2026-01-01', fin: '2026-01-15' },
    });
    expect(r.filas).toHaveLength(0);
    expect(r.total).toBe(0);
  });

  it('dia libre laborado: TODOS los tramos, tipo "Dias Libres Laborados"', () => {
    const tramos: TramoJornada[] = [
      { inicio: f(10, 0), fin: f(10, 6), minutos: 360, periodo: 'nocturno', categoria: 'ordinario', tipoHora: 'descansoLaboradoNocturna' },
      { inicio: f(10, 6), fin: f(10, 8), minutos: 120, periodo: 'diurno', categoria: 'ordinario', tipoHora: 'descansoLaboradoDiurna' },
    ];
    const r = construirFo3106({
      jornadas: [{ fecha: '2026-01-10', esAsueto: false, esDescansoSemanalLaborado: true, tramos }],
      perfil,
      tarea: 'x',
      periodo: { inicio: '2026-01-01', fin: '2026-01-15' },
    });
    expect(r.filas.every((x) => x.tipo === TIPO_PREAUTORIZACION.diasLibres)).toBe(true);
    expect(r.total).toBe(8);
  });

  it('asueto: tipo "Feriados Laborados", incluye ordinario y extra', () => {
    const r = construirFo3106({
      jornadas: [{ fecha: '2026-01-06', esAsueto: true, esDescansoSemanalLaborado: false, tramos: tramosDespacho('2026-01-06', 6, f(7, 5, 11), ['2026-01-06', '2026-01-07']) }],
      perfil,
      tarea: 'x',
      periodo: { inicio: '2026-01-01', fin: '2026-01-15' },
    });
    expect(r.filas.every((x) => x.tipo === TIPO_PREAUTORIZACION.feriados)).toBe(true);
    expect(r.filas.length).toBeGreaterThan(1);
  });

  it('asueto por dia calendario (caso Walmart 02/11): 21:00-24:00 Feriados y 04:00-05:11 Horas Extras', () => {
    const r = construirFo3106({
      jornadas: [{ fecha: '2026-01-06', esAsueto: true, esDescansoSemanalLaborado: false, tramos: tramosDespacho('2026-01-06', 6, f(7, 5, 11), ['2026-01-06']) }],
      perfil,
      tarea: 'x',
      periodo: { inicio: '2026-01-01', fin: '2026-01-15' },
    });
    expect(r.filas.map((x) => [x.tipo, x.de, x.a, x.tiempoNomina])).toEqual([
      [TIPO_PREAUTORIZACION.feriados, '21:00', '00:00', 3],
      [TIPO_PREAUTORIZACION.horasExtras, '04:00', '05:11', 1.18],
    ]);
  });

  it('las filas salen ordenadas por fecha y hora', () => {
    const r = construirFo3106({
      jornadas: [
        { fecha: '2026-01-07', esAsueto: false, esDescansoSemanalLaborado: false, tramos: tramosDespacho('2026-01-07', 7, f(8, 8)) },
        { fecha: '2026-01-06', esAsueto: false, esDescansoSemanalLaborado: false, tramos: tramosDespacho('2026-01-06', 6, f(7, 5, 11)) },
      ],
      perfil,
      tarea: 'x',
      periodo: { inicio: '2026-01-01', fin: '2026-01-15' },
    });
    expect(r.filas.map((x) => x.fecha)).toEqual(['06/01/2026', '07/01/2026', '07/01/2026']);
    expect(r.total).toBe(4.18);
  });
});
