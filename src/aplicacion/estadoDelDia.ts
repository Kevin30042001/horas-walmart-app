import type { RegistroRow } from '../data/db';

export type AccionMarcado = 'entrada' | 'inicioReceso' | 'finReceso' | 'salida';

const ORDEN: AccionMarcado[] = ['entrada', 'inicioReceso', 'finReceso', 'salida'];

const ETIQUETAS: Record<AccionMarcado, string> = {
  entrada: 'Marcar entrada',
  inicioReceso: 'Iniciar receso',
  finReceso: 'Terminar receso',
  salida: 'Marcar salida',
};

export function obtenerEtiquetaAccion(accion: AccionMarcado): string {
  return ETIQUETAS[accion];
}

/**
 * Siguiente accion esperada segun los registros de hoy (entrada -> receso ->
 * salida, en orden), o null si la jornada de hoy ya esta completa.
 */
export function siguienteAccion(registrosHoy: RegistroRow[]): AccionMarcado | null {
  for (const accion of ORDEN) {
    if (!registrosHoy.some((r) => r.tipoEvento === accion)) return accion;
  }
  return null;
}
