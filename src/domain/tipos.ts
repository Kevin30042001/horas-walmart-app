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

/** Fila editable de la tabla "Reglas de pago" (Configuracion). Nada va quemado en el codigo. */
export interface ReglaPago {
  tipoHora: TipoHora;
  /** Factor multiplicador sobre la hora base diurna (Art. 161/168/169/192 Codigo de Trabajo). */
  factor: number;
  articuloLey: string;
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
  /** Ventana exacta del receso a descontar (si aplica). null = sin receso. */
  receso?: Intervalo | null;
  esAsueto?: boolean;
  esDescansoSemanalLaborado?: boolean;
  turno: ParametrosTurno;
}

export interface ResultadoJornada {
  fecha: string;
  desgloseMinutos: DesgloseMinutos;
  totalMinutosTrabajados: number;
  tipoJornadaLegal: 'diurna' | 'nocturna';
  advertencias: string[];
}

export interface DetalleCalculo {
  tipoHora: TipoHora;
  minutos: number;
  /** Horas en formato decimal de nomina (tabla oficial de conversion minutos->decimal). */
  horas: number;
  factor: number;
  articuloLey: string;
  monto: number;
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
