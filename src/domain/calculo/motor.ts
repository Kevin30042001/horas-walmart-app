import type {
  DesgloseMinutos,
  EntradaJornada,
  Intervalo,
  ResultadoJornada,
  TipoHora,
  TramoJornada,
  VentanaProgramada,
} from '../tipos';
import { TODOS_LOS_TIPOS_HORA } from '../tipos';
import { clasificarDiurnoNocturno } from '../tiempo/segmentos';
import { minutosSolapados } from '../horario/ventana';

/**
 * Version del motor de calculo. Si cambia, las jornadas guardadas con una
 * version anterior se recalculan al abrir la app.
 */
export const VERSION_CALCULO = 3;

/** Jornada mixta con mas de 3.5h nocturnas se considera nocturna (Art. 161 C.T.). */
export const UMBRAL_NOCTURNO_MIXTA_MIN = 210;
/** Jornada ordinaria maxima diaria: 8h diurna / 7h nocturna (Art. 161 C.T.). Solo ALERTA. */
export const MAX_ORDINARIA_DIURNA_MIN = 480;
export const MAX_ORDINARIA_NOCTURNA_MIN = 420;

function fechaIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function desgloseVacio(): DesgloseMinutos {
  const base = {} as DesgloseMinutos;
  for (const tipo of TODOS_LOS_TIPOS_HORA) base[tipo] = 0;
  return base;
}

type Contexto = 'normal' | 'asueto' | 'descanso';

function tipoHoraPara(contexto: Contexto, categoria: 'ordinario' | 'extra', periodo: 'diurno' | 'nocturno'): TipoHora {
  const d = periodo === 'diurno';
  if (contexto === 'descanso') return d ? 'descansoLaboradoDiurna' : 'descansoLaboradoNocturna';
  if (contexto === 'asueto') {
    if (categoria === 'ordinario') return d ? 'asuetoDiurna' : 'asuetoNocturna';
    return d ? 'asuetoExtraDiurna' : 'asuetoExtraNocturna';
  }
  if (categoria === 'ordinario') return d ? 'ordinariaDiurna' : 'ordinariaNocturna';
  return d ? 'extraDiurna' : 'extraNocturna';
}

/** Aplica la tolerancia: recorta llegadas tempranas / salidas tardias de pocos minutos. */
function aplicarTolerancia(
  entrada: Date,
  salida: Date,
  programado: VentanaProgramada | null,
  toleranciaMin: number
): { inicio: Date; fin: Date; ignorados: number } {
  let inicio = entrada;
  let fin = salida;
  let ignorados = 0;
  if (programado && toleranciaMin > 0) {
    const temprano = (programado.inicio.getTime() - entrada.getTime()) / 60000;
    if (temprano > 0 && temprano <= toleranciaMin && programado.inicio < salida) {
      inicio = programado.inicio;
      ignorados += temprano;
    }
    const tarde = (salida.getTime() - programado.fin.getTime()) / 60000;
    if (tarde > 0 && tarde <= toleranciaMin && programado.fin > inicio) {
      fin = programado.fin;
      ignorados += tarde;
    }
  }
  return { inicio, fin, ignorados: Math.round(ignorados) };
}

/** Minutos programados que no se cubrieron (descontando el receso programado). */
function calcularFaltante(entrada: Date, salida: Date, programado: VentanaProgramada | null): number {
  if (!programado) return 0;
  const progBruto = minutosSolapados(programado, programado);
  const progReceso = programado.receso ? minutosSolapados(programado.receso, programado) : 0;
  const trabajado: Intervalo = { inicio: entrada, fin: salida };
  const cubierto = minutosSolapados(trabajado, programado);
  let recesoCubierto = 0;
  if (programado.receso) {
    const ini = new Date(Math.max(entrada.getTime(), programado.inicio.getTime()));
    const fin = new Date(Math.min(salida.getTime(), programado.fin.getTime()));
    if (fin > ini) recesoCubierto = minutosSolapados({ inicio: ini, fin }, programado.receso);
  }
  return Math.max(0, progBruto - progReceso - (cubierto - recesoCubierto));
}

/** Une segmentos contiguos con el mismo tipo de hora en un solo tramo. */
function unirTramos(tramos: TramoJornada[]): TramoJornada[] {
  const resultado: TramoJornada[] = [];
  for (const t of tramos) {
    const ultimo = resultado.at(-1);
    if (ultimo && ultimo.tipoHora === t.tipoHora && ultimo.fin.getTime() === t.inicio.getTime()) {
      ultimo.fin = t.fin;
      ultimo.minutos += t.minutos;
    } else {
      resultado.push({ ...t });
    }
  }
  return resultado;
}

/**
 * Calcula una jornada (un par entrada/salida con su receso) segun la REGLA DEL
 * FORMATO FO-3106:
 *
 *  - Extra     = minutos trabajados FUERA de la ventana programada del dia
 *                (antes de la entrada programada o despues de la salida).
 *  - Ordinario = minutos DENTRO de la ventana programada, menos el receso.
 *  - Dia libre o dia sin horario -> todo es "dia libre laborado".
 *  - Asueto (por DIA CALENDARIO, como Walmart) -> ordinario dentro del
 *    horario = asueto, fuera = asueto extra.
 *    (Asueto en un dia sin horario: hasta el tope legal diario es asueto, el
 *    resto asueto extra.)
 *  - Cada tramo se divide en diurno/nocturno en las 06:00 y 19:00.
 *  - El tope legal (8 h diurna / 7 h nocturna) es solo una ALERTA, no decide
 *    que es extra: el jueves de Recibo (9 h) es jornada programada.
 *  - Llegar tarde / salir temprano se reporta como faltante, no se resta.
 */
export function calcularJornada(entrada: EntradaJornada): ResultadoJornada {
  const programado = entrada.programado ?? null;
  const toleranciaMin = entrada.toleranciaMin ?? 0;
  const { inicio, fin, ignorados } = aplicarTolerancia(entrada.entrada, entrada.salida, programado, toleranciaMin);

  const asuetos = new Set(entrada.fechasAsueto ?? []);
  const esMinutoDeAsueto = (d: Date) => Boolean(entrada.esAsueto) || asuetos.has(fechaIso(d));

  const cortes = programado ? [programado.inicio, programado.fin] : [];
  // Cortes en cada medianoche: el asueto se aplica por dia calendario.
  const medianoches: Date[] = [];
  for (const m = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1); m < fin; m.setDate(m.getDate() + 1)) {
    medianoches.push(new Date(m));
  }
  cortes.push(...medianoches);

  // Receso: se descuenta, salvo (opcion) la parte que cae en el dia de asueto.
  const exclusiones: Intervalo[] = [];
  const recesoPagado: Intervalo[] = [];
  if (entrada.receso) {
    const puntos = [entrada.receso.inicio, ...medianoches.filter((m) => m > entrada.receso!.inicio && m < entrada.receso!.fin), entrada.receso.fin];
    for (let i = 0; i < puntos.length - 1; i++) {
      const pieza = { inicio: puntos[i]!, fin: puntos[i + 1]! };
      if (entrada.recesoPagadoEnAsueto && esMinutoDeAsueto(pieza.inicio)) {
        recesoPagado.push(pieza);
        cortes.push(pieza.inicio, pieza.fin);
      } else {
        exclusiones.push(pieza);
      }
    }
  }
  const enRecesoPagado = (seg: { inicio: Date; fin: Date }) =>
    recesoPagado.some((r) => seg.inicio >= r.inicio && seg.fin <= r.fin);

  const { diurnoMin, nocturnoMin, segmentos } = clasificarDiurnoNocturno(inicio, fin, exclusiones, cortes);
  const totalMinutosTrabajados = diurnoMin + nocturnoMin;

  const tipoJornadaLegal: 'diurna' | 'nocturna' =
    nocturnoMin > UMBRAL_NOCTURNO_MIXTA_MIN ? 'nocturna' : 'diurna';
  const topeLegalMin = tipoJornadaLegal === 'nocturna' ? MAX_ORDINARIA_NOCTURNA_MIN : MAX_ORDINARIA_DIURNA_MIN;

  const contextoBase: Contexto = entrada.esDescansoSemanalLaborado || !programado ? 'descanso' : 'normal';

  const crudos: TramoJornada[] = [];
  let acumuladoSinHorario = 0;
  for (const seg of segmentos) {
    const minutos = Math.round(seg.minutos);
    const contexto: Contexto = esMinutoDeAsueto(seg.inicio) ? 'asueto' : contextoBase;
    if (enRecesoPagado(seg)) {
      crudos.push({ ...seg, minutos, periodo: seg.tipo, categoria: 'extra', tipoHora: tipoHoraPara('asueto', 'extra', seg.tipo) });
      continue;
    }
    if (programado) {
      const dentro =
        seg.inicio.getTime() >= programado.inicio.getTime() && seg.fin.getTime() <= programado.fin.getTime();
      const categoria = contexto === 'descanso' ? 'ordinario' : dentro ? 'ordinario' : 'extra';
      crudos.push({ ...seg, minutos, periodo: seg.tipo, categoria, tipoHora: tipoHoraPara(contexto, categoria, seg.tipo) });
      continue;
    }
    if (contexto !== 'asueto') {
      crudos.push({ ...seg, minutos, periodo: seg.tipo, categoria: 'ordinario', tipoHora: tipoHoraPara(contexto, 'ordinario', seg.tipo) });
      continue;
    }
    // Asueto sin horario: los primeros `topeLegalMin` minutos son asueto, el resto asueto extra.
    const disponible = Math.max(0, topeLegalMin - acumuladoSinHorario);
    const ordinario = Math.min(minutos, disponible);
    if (ordinario > 0) {
      const corte = new Date(seg.inicio.getTime() + ordinario * 60000);
      crudos.push({ inicio: seg.inicio, fin: corte, minutos: ordinario, periodo: seg.tipo, categoria: 'ordinario', tipoHora: tipoHoraPara('asueto', 'ordinario', seg.tipo) });
      if (minutos > ordinario) {
        crudos.push({ inicio: corte, fin: seg.fin, minutos: minutos - ordinario, periodo: seg.tipo, categoria: 'extra', tipoHora: tipoHoraPara('asueto', 'extra', seg.tipo) });
      }
    } else {
      crudos.push({ inicio: seg.inicio, fin: seg.fin, minutos, periodo: seg.tipo, categoria: 'extra', tipoHora: tipoHoraPara('asueto', 'extra', seg.tipo) });
    }
    acumuladoSinHorario += minutos;
  }

  const tramos = unirTramos(crudos);
  const desglose = desgloseVacio();
  for (const t of tramos) desglose[t.tipoHora] += t.minutos;

  const advertencias: string[] = [];
  if (totalMinutosTrabajados > topeLegalMin) {
    advertencias.push(
      `Supera el tope legal diario: ${(totalMinutosTrabajados / 60).toFixed(2)} h > ${topeLegalMin / 60} h (jornada ${tipoJornadaLegal}).`
    );
  }
  if (totalMinutosTrabajados > topeLegalMin + 240) {
    advertencias.push(
      `Jornada muy larga (${Math.round(totalMinutosTrabajados / 60)} h): revisa si el registro es correcto.`
    );
  }

  return {
    fecha: entrada.fecha,
    desgloseMinutos: desglose,
    tramos,
    totalMinutosTrabajados,
    minutosFaltantes: calcularFaltante(entrada.entrada, entrada.salida, programado),
    minutosIgnoradosTolerancia: ignorados,
    tipoJornadaLegal,
    advertencias,
  };
}

export type { TipoHora };
