export interface ResultadoParseoOcr {
  fecha: string | null; // yyyy-MM-dd
  hora: string | null; // HH:mm (24h)
  confianza: number; // 0..1, heuristica simple -- SIEMPRE se pide confirmacion al usuario
}

const PATRON_FECHA = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/;
const PATRON_HORA = /\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?\b/i;

function normalizarAnio(anio: number): number {
  return anio < 100 ? 2000 + anio : anio;
}

function normalizarFecha(dia: number, mes: number, anio: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const a = normalizarAnio(anio);
  return `${a}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function normalizarHora(horaStr: string, minutoStr: string, ampm: string | undefined): string | null {
  let hora = Number(horaStr);
  const minuto = Number(minutoStr);
  if (Number.isNaN(hora) || Number.isNaN(minuto) || minuto > 59) return null;

  if (ampm) {
    const esPm = /p/i.test(ampm);
    if (hora === 12) hora = esPm ? 12 : 0;
    else if (esPm) hora += 12;
  }
  if (hora > 23) return null;

  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

/**
 * Extrae fecha y hora de un texto reconocido por OCR, tolerando formatos
 * comunes de reloj marcador (dd/mm/aaaa, hh:mm 24h o AM/PM). NUNCA se usa
 * directo: la UI siempre muestra el resultado + confianza y pide confirmacion
 * o correccion manual antes de guardar nada.
 */
export function extraerFechaHoraDeTexto(texto: string): ResultadoParseoOcr {
  const coincidenciaFecha = texto.match(PATRON_FECHA);
  const coincidenciaHora = texto.match(PATRON_HORA);

  const fecha = coincidenciaFecha
    ? normalizarFecha(Number(coincidenciaFecha[1]), Number(coincidenciaFecha[2]), Number(coincidenciaFecha[3]))
    : null;
  const hora = coincidenciaHora
    ? normalizarHora(coincidenciaHora[1]!, coincidenciaHora[2]!, coincidenciaHora[3])
    : null;

  let confianza = 0;
  if (fecha && hora) confianza = 0.85;
  else if (fecha || hora) confianza = 0.45;

  return { fecha, hora, confianza };
}
