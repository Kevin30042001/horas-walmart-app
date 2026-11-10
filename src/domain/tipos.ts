/**
 * Tipos del dominio de calculo de horas y pago.
 * Esta capa NO conoce React, Dexie ni el DOM: es logica pura y testeable.
 */

/** Las 10 clasificaciones de minuto trabajado que reconoce el motor. */
export type TipoHora =
  | 'ordinariaDiurna'
  | 'ordinariaNocturna'
  | 'extraDiurna'
  | 'extraNocturna'
  | 'asuetoDiurna'
  | 'asuetoNocturna'
  | 'asuetoExtraDiurna'
  | 'asuetoExtraNocturna'
  | 'descansoLaboradoDiurna'
  | 'descansoLaboradoNocturna';

export const TODOS_LOS_TIPOS_HORA: readonly TipoHora[] = [
  'ordinariaDiurna',
  'ordinariaNocturna',
  'extraDiurna',
  'extraNocturna',
  'asuetoDiurna',
  'asuetoNocturna',
  'asuetoExtraDiurna',
  'asuetoExtraNocturna',
  'descansoLaboradoDiurna',
  'descansoLaboradoNocturna',
];

/** Minutos acumulados por cada tipo de hora en una jornada o periodo. */
export type DesgloseMinutos = Record<TipoHora, number>;

export interface Intervalo {
  inicio: Date;
  fin: Date;
}

/** Ventana de reloj en formato "HH:mm" (sin fecha). */
export interface VentanaReloj {
  inicio: string;
  fin: string;
}

/**
 * Horario programado de UN dia de la semana. Si `horaSalida` <= `horaEntrada`
 * la salida cae al dia siguiente (turno nocturno). El receso es una ventana
 * con hora de inicio y fin (ej. Despacho 00:00-01:00), o null si ese dia no
 * tiene receso descontado.
 */
export interface HorarioProgramado {
  horaEntrada: string;
  horaSalida: string;
  receso: VentanaReloj | null;
}

/** Ventana programada ya anclada a fechas reales (para una jornada concreta). */
export interface VentanaProgramada {
  inicio: Date;
  fin: Date;
  receso: Intervalo | null;
}

/** Horas en decimal de nomina por tipo de hora. */
export type HorasPorTipo = Record<TipoHora, number>;

/**
 * Fila editable de la tabla "Reglas de pago" (Configuracion). Nada va quemado
 * en el codigo. Cada regla es una linea de la boleta:
 *  - 'recargo'  : se SUMA sobre el salario fijo (ej. Nocturnidad 25 %, que
 *                 paga solo el 0.25 porque la hora ya esta en el salario).
 *  - 'completo' : se paga la hora completa con su factor (ej. Horas Extras 200 %).
 */
export interface ReglaPago {
  tipoHora: TipoHora;
  /** Nombre de la linea tal como sale en la boleta. */
  nombreLinea: string;
  modo: 'recargo' | 'completo';
  /** Factor sobre la hora base diurna. */
  factor: number;
  articuloLey: string;
  /** Solo informativo: esta linea da derecho a un dia compensatorio (Art. 175 C.T.). */
  diaCompensatorio?: boolean;
}

/** Parametros del turno relevantes para el motor (el resto -horarios, recesos- vive en Dexie). */
export interface ParametrosTurno {
  nombre: string;
  /** Tope legal de horas ordinarias por semana para este turno: 44 (Recibo) o 39 (Despacho) por defecto. */
  horasSemanales: number;
  /** 0=domingo ... 6=sabado. Dia en que inicia la semana laboral de este turno. */
  diaInicioSemana: number;
}

export interface EntradaJornada {
  /** Fecha (yyyy-MM-dd) de la jornada = fecha de ENTRADA, aunque la salida caiga al dia siguiente. */
  fecha: string;
  entrada: Date;
  salida: Date;
  /** Ventana exacta del receso a descontar (real o asumido). null = sin receso. */
  receso?: Intervalo | null;
  /**
   * Ventana programada del dia segun el horario del turno. null/undefined =
   * dia libre o dia sin horario (todo cuenta como dia libre laborado).
   */
  programado?: VentanaProgramada | null;
  esAsueto?: boolean;
  esDescansoSemanalLaborado?: boolean;
  /** Minutos de llegada temprana / salida tarde que se ignoran (por defecto 0). */
  toleranciaMin?: number;
  turno: ParametrosTurno;
}

/**
 * Tramo continuo de una jornada con un solo tipo de hora (ej. 05:00-06:00
 * extra nocturna). Es la unidad que se redondea a decimal (como nomina) y la
 * fila del formato FO-3106.
 */
export interface TramoJornada {
  inicio: Date;
  fin: Date;
  minutos: number;
  periodo: 'diurno' | 'nocturno';
  categoria: 'ordinario' | 'extra';
  tipoHora: TipoHora;
}

export interface ResultadoJornada {
  fecha: string;
  desgloseMinutos: DesgloseMinutos;
  tramos: TramoJornada[];
  totalMinutosTrabajados: number;
  /** Minutos programados que no se trabajaron (llegada tarde / salida temprana). Informativo. */
  minutosFaltantes: number;
  /** Minutos fuera del horario que no se contaron por estar dentro de la tolerancia. */
  minutosIgnoradosTolerancia: number;
  tipoJornadaLegal: 'diurna' | 'nocturna';
  advertencias: string[];
}

/** Una linea de la proyeccion de pago ("por que se pago asi"). */
export interface DetalleCalculo {
  tipoHora: TipoHora;
  nombreLinea: string;
  modo: 'recargo' | 'completo';
  /** Horas en formato decimal de nomina (suma de los decimales de cada tramo). */
  horas: number;
  factor: number;
  articuloLey: string;
  monto: number;
  diaCompensatorio: boolean;
  /** Ej. "1.45 h x 2.675 x 2.00 = 7.76". */
  explicacion: string;
}

/** Un tramo de una tabla de retencion progresiva (ISR por quincena). */
export interface TramoIsr {
  desde: number;
  hasta: number | null;
  cuotaFija: number;
  porcentajeExceso: number;
}

/** Fila editable de la tabla "Deducciones" (Configuracion). ISSS/AFP/ISR, todo editable. */
export interface ReglaDeduccion {
  nombre: string;
  tipo: 'porcentaje' | 'tabla';
  valorPorcentaje: number | null;
  tramosIsr: TramoIsr[] | null;
  tope: number | null;
  activo: boolean;
}

export interface DetalleDeduccion {
  nombre: string;
  monto: number;
}
