import type { RegistroRow } from '../data/db';
import type { Intervalo } from '../domain/tipos';

export type AccionMarcado = 'entrada' | 'inicioReceso' | 'finReceso' | 'salida';

const ETIQUETAS: Record<AccionMarcado, string> = {
  entrada: 'Marcar entrada',
  inicioReceso: 'Iniciar receso',
  finReceso: 'Terminar receso',
  salida: 'Marcar salida',
};

export function obtenerEtiquetaAccion(accion: AccionMarcado): string {
  return ETIQUETAS[accion];
}

export interface EstadoAcciones {
  /** Accion del boton grande, o null si la jornada ya esta completa. */
  principal: AccionMarcado | null;
  /** Acciones disponibles con botones secundarios. */
  secundarias: AccionMarcado[];
}

export interface OpcionesAcciones {
  /** El horario de ESE dia tiene receso (los sabados de Recibo no). */
  tieneReceso: boolean;
  /** Ventana programada del receso, para sugerirlo como accion principal cerca de su hora. */
  recesoProgramado?: Intervalo | null;
  ahora?: Date;
}

/** Minutos antes del receso programado en que el boton grande pasa a "Iniciar receso". */
const MARGEN_SUGERIR_RECESO_MIN = 20;

/**
 * Acciones disponibles para la jornada (abierta o nueva). Reglas:
 *  - Sin entrada -> entrada.
 *  - En receso -> terminar receso (salida tambien disponible).
 *  - El receso es OPCIONAL: "Marcar salida" siempre esta disponible, y
 *    "Iniciar receso" solo aparece si el horario de ese dia tiene receso.
 *  - Con salida -> jornada completa.
 */
export function siguienteAccion(registrosJornada: RegistroRow[], opciones: OpcionesAcciones): EstadoAcciones {
  const hay = (t: AccionMarcado) => registrosJornada.some((r) => r.tipoEvento === t);

  if (!hay('entrada')) return { principal: 'entrada', secundarias: [] };
  if (hay('salida')) return { principal: null, secundarias: [] };
  if (hay('inicioReceso') && !hay('finReceso')) return { principal: 'finReceso', secundarias: ['salida'] };

  const recesoPendiente = opciones.tieneReceso && !hay('inicioReceso');
  if (!recesoPendiente) return { principal: 'salida', secundarias: [] };

  const { recesoProgramado, ahora } = opciones;
  if (recesoProgramado && ahora) {
    const desde = recesoProgramado.inicio.getTime() - MARGEN_SUGERIR_RECESO_MIN * 60_000;
    if (ahora.getTime() >= desde && ahora.getTime() < recesoProgramado.fin.getTime()) {
      return { principal: 'inicioReceso', secundarias: ['salida'] };
    }
  }
  return { principal: 'salida', secundarias: ['inicioReceso'] };
}
