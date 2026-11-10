import type { RegistroRow } from '../data/db';
import type { VentanaProgramada } from '../domain/tipos';

export interface ProgresoJornada {
  estado: 'sinMarcar' | 'enJornada' | 'enReceso' | 'completa';
  /** Minutos trabajados hasta `ahora` (o hasta la salida), sin el receso. */
  trabajadoMin: number;
  /** Minutos fuera de la ventana programada hasta ahora (llegada temprana + quedarse despues). */
  extraMin: number;
}

const min = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 60000);

/** Progreso en vivo de la jornada para el anillo de la pantalla Marcar. */
export function calcularProgreso(
  registros: Pick<RegistroRow, 'tipoEvento' | 'horaReal'>[],
  ventana: VentanaProgramada | null,
  ahora: Date
): ProgresoJornada {
  const buscar = (t: RegistroRow['tipoEvento']) => registros.find((r) => r.tipoEvento === t)?.horaReal;
  const entrada = buscar('entrada');
  if (!entrada) return { estado: 'sinMarcar', trabajadoMin: 0, extraMin: 0 };

  const salida = buscar('salida');
  const ini = buscar('inicioReceso');
  const fin = buscar('finReceso');
  const corte = salida ?? ahora;

  let trabajado = min(entrada, corte);
  if (ini) trabajado -= min(ini, fin ?? corte);

  let extra = 0;
  if (ventana) {
    if (entrada < ventana.inicio) extra += min(entrada, ventana.inicio < corte ? ventana.inicio : corte);
    if (corte > ventana.fin) extra += min(ventana.fin > entrada ? ventana.fin : entrada, corte);
  }

  const estado = salida ? 'completa' : ini && !fin ? 'enReceso' : 'enJornada';
  return { estado, trabajadoMin: Math.floor(Math.max(0, trabajado)), extraMin: Math.floor(extra) };
}
