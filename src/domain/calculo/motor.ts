import type { DesgloseMinutos, EntradaJornada, ResultadoJornada, TipoHora } from '../tipos';
import { TODOS_LOS_TIPOS_HORA } from '../tipos';
import { clasificarDiurnoNocturno, type SegmentoClasificado } from '../tiempo/segmentos';

/** Jornada mixta con mas de 3.5h nocturnas se considera nocturna (Art. 161 C.T.). */
export const UMBRAL_NOCTURNO_MIXTA_MIN = 210;
/** Jornada ordinaria maxima diaria: 8h diurna / 7h nocturna (Art. 161 C.T.). */
export const MAX_ORDINARIA_DIURNA_MIN = 480;
export const MAX_ORDINARIA_NOCTURNA_MIN = 420;

function desgloseVacio(): DesgloseMinutos {
  const base = {} as DesgloseMinutos;
  for (const tipo of TODOS_LOS_TIPOS_HORA) base[tipo] = 0;
  return base;
}

function asignarMinutos(
  desglose: DesgloseMinutos,
  tipoSegmento: 'diurno' | 'nocturno',
  minutosOrdinarios: number,
  minutosExtra: number,
  entrada: EntradaJornada
): void {
  if (entrada.esAsueto) {
    if (tipoSegmento === 'diurno') {
      desglose.asuetoDiurna += minutosOrdinarios;
      desglose.asuetoExtraDiurna += minutosExtra;
    } else {
      desglose.asuetoNocturna += minutosOrdinarios;
      desglose.asuetoExtraNocturna += minutosExtra;
    }
    return;
  }

  if (entrada.esDescansoSemanalLaborado) {
    if (tipoSegmento === 'diurno') {
      desglose.descansoLaboradoDiurna += minutosOrdinarios;
      desglose.extraDiurna += minutosExtra;
    } else {
      desglose.descansoLaboradoNocturna += minutosOrdinarios;
      desglose.extraNocturna += minutosExtra;
    }
    return;
  }

  if (tipoSegmento === 'diurno') {
    desglose.ordinariaDiurna += minutosOrdinarios;
    desglose.extraDiurna += minutosExtra;
  } else {
    desglose.ordinariaNocturna += minutosOrdinarios;
    desglose.extraNocturna += minutosExtra;
  }
}

/**
 * Reparte los minutos "ordinarios" vs "extra" de una lista de segmentos ya
 * clasificados (diurno/nocturno), tomando como extra la COLA cronologica de
 * la jornada (es decir: trabajas tu horario normal y te quedas de mas al final,
 * que es como realmente ocurren las horas extra en la practica).
 */
function repartirOrdinarioYExtra(
  segmentos: SegmentoClasificado[],
  minutosOrdinariosTotales: number,
  entrada: EntradaJornada,
  desglose: DesgloseMinutos
): void {
  let acumulado = 0;
  for (const seg of segmentos) {
    const disponibleOrdinario = Math.max(0, minutosOrdinariosTotales - acumulado);
    const minOrd = Math.min(seg.minutos, disponibleOrdinario);
    const minExtra = seg.minutos - minOrd;
    acumulado += seg.minutos;
    asignarMinutos(desglose, seg.tipo, minOrd, minExtra, entrada);
  }
}

/**
 * Calcula el desglose de minutos por tipo de hora para UNA jornada (un par
 * entrada/salida, con su receso). Cubre: cruce de medianoche (via
 * clasificarDiurnoNocturno), jornada mixta (umbral de 3.5h nocturnas),
 * asueto laborado y dia de descanso semanal laborado.
 *
 * El tope SEMANAL (44h/39h) no se aplica aqui -- ver `semanal.ts` -- porque es
 * una verificacion de cumplimiento legal sobre un grupo de jornadas, no una
 * propiedad de una jornada individual.
 */
export function calcularJornada(entrada: EntradaJornada): ResultadoJornada {
  const exclusiones = entrada.receso ? [entrada.receso] : [];
  const { diurnoMin, nocturnoMin, segmentos } = clasificarDiurnoNocturno(
    entrada.entrada,
    entrada.salida,
    exclusiones
  );
  const totalMinutosTrabajados = diurnoMin + nocturnoMin;

  const tipoJornadaLegal: 'diurna' | 'nocturna' =
    nocturnoMin > UMBRAL_NOCTURNO_MIXTA_MIN ? 'nocturna' : 'diurna';
  const maxOrdinariaMin =
    tipoJornadaLegal === 'nocturna' ? MAX_ORDINARIA_NOCTURNA_MIN : MAX_ORDINARIA_DIURNA_MIN;

  const advertencias: string[] = [];
  const desglose = desgloseVacio();

  // El tope diario (8h diurna / 7h nocturna) aplica igual en dia normal, asueto
  // o descanso laborado -- lo que cambia es a que "cubeta" cae cada minuto
  // (ordinaria/extra vs asueto/asuetoExtra vs descansoLaborado/extra), y eso
  // ya lo resuelve `asignarMinutos` segun los flags de `entrada`.
  const minutosExtra = Math.max(0, totalMinutosTrabajados - maxOrdinariaMin);
  const minutosOrdinarios = totalMinutosTrabajados - minutosExtra;
  repartirOrdinarioYExtra(segmentos, minutosOrdinarios, entrada, desglose);

  if (totalMinutosTrabajados > maxOrdinariaMin + 240) {
    advertencias.push(
      `Jornada muy larga (${Math.round(totalMinutosTrabajados / 60)}h) - revisa si el registro es correcto.`
    );
  }

  return { fecha: entrada.fecha, desgloseMinutos: desglose, totalMinutosTrabajados, tipoJornadaLegal, advertencias };
}

export type { TipoHora };
