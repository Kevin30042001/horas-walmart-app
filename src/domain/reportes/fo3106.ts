import type { TramoJornada } from '../tipos';
import { minutosADecimal } from '../tiempo/decimal';

export const TIPO_PREAUTORIZACION = {
  horasExtras: 'Preautorización Horas Extras',
  diasLibres: 'Preautorización Días Libres Laborados',
  feriados: 'Preautorización Feriados Laborados',
} as const;

export type TipoPreautorizacion = (typeof TIPO_PREAUTORIZACION)[keyof typeof TIPO_PREAUTORIZACION];

export interface JornadaFo3106 {
  fecha: string; // yyyy-MM-dd
  esAsueto: boolean;
  esDescansoSemanalLaborado: boolean;
  tramos: TramoJornada[];
}

export interface FilaFo3106 {
  fecha: string; // dd/mm/aaaa
  tipo: TipoPreautorizacion;
  gafete: string;
  asociado: string;
  jornada: 'DIURNA' | 'NOCTURNA';
  de: string; // HH:mm
  a: string; // HH:mm
  tiempoNomina: number; // decimal de nomina
  tarea: string;
}

export interface Fo3106 {
  encabezado: {
    codigo: 'FO-3106';
    titulo: string;
    division: string;
    departamento: string;
    periodo: string;
  };
  filas: FilaFo3106[];
  total: number;
}

export interface EntradaFo3106 {
  jornadas: JornadaFo3106[];
  perfil: { gafete: string; nombre: string; division: string; departamento: string };
  tarea: string;
  periodo: { inicio: string; fin: string };
}

export function fechaDdMmAaaa(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Tipo de cada fila segun su tramo (el asueto va por dia calendario, asi que
 * en un turno nocturno puede haber filas de feriado y de horas extras):
 * tramo de asueto -> Feriados; dia libre -> Dias Libres; resto -> Horas Extras.
 */
function tipoDeTramo(j: JornadaFo3106, t: TramoJornada): TipoPreautorizacion | null {
  if (t.tipoHora.startsWith('asueto')) return TIPO_PREAUTORIZACION.feriados;
  if (t.tipoHora.startsWith('descanso') || j.esDescansoSemanalLaborado) return TIPO_PREAUTORIZACION.diasLibres;
  return t.categoria === 'extra' ? TIPO_PREAUTORIZACION.horasExtras : null;
}

/**
 * Arma el formato FO-3106 (Pre-autorizacion de Horas Extras, dias libres y
 * Feriados) del corte, igual que el Excel que se entrega al jefe:
 *  - Dia normal: una fila por tramo EXTRA.
 *  - Dia libre y tramos de asueto: una fila por cada tramo trabajado.
 *  - Cada tramo ya viene dividido en DIURNA/NOCTURNA en las 06:00 y 19:00.
 *  - "Tiempo en nomina" = minutos/60 redondeado a 2 decimales por fila.
 */
export function construirFo3106({ jornadas, perfil, tarea, periodo }: EntradaFo3106): Fo3106 {
  const filas: (FilaFo3106 & { orden: number })[] = [];
  for (const j of jornadas) {
    for (const t of j.tramos ?? []) {
      const tipo = tipoDeTramo(j, t);
      if (!tipo) continue;
      filas.push({
        fecha: fechaDdMmAaaa(j.fecha),
        tipo,
        gafete: perfil.gafete,
        asociado: perfil.nombre,
        jornada: t.periodo === 'nocturno' ? 'NOCTURNA' : 'DIURNA',
        de: hhmm(t.inicio),
        a: hhmm(t.fin),
        tiempoNomina: minutosADecimal(t.minutos),
        tarea,
        orden: new Date(t.inicio).getTime(),
      });
    }
  }
  filas.sort((x, y) => x.orden - y.orden);
  const total = Math.round(filas.reduce((acc, x) => acc + x.tiempoNomina, 0) * 100) / 100;

  return {
    encabezado: {
      codigo: 'FO-3106',
      titulo: 'Formato Pre-autorizacion de Horas Extras, días libres y Feriados',
      division: perfil.division,
      departamento: perfil.departamento,
      periodo: `${fechaDdMmAaaa(periodo.inicio)} al ${fechaDdMmAaaa(periodo.fin)}`,
    },
    filas: filas.map(({ orden: _o, ...fila }) => fila),
    total,
  };
}
