/** Utilidades de fecha/hora para la UI. Dominio puro vive en src/domain/tiempo -- esto es solo formato. */

export function fechaLocalHoy(): string {
  const hoy = new Date();
  return formatoFechaLocal(hoy);
}

export function formatoFechaLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function parsearFechaLocal(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio!, mes! - 1, dia!);
}

export function formatoHora(fecha: Date | string | number, formato24h = true): string {
  // Tolerante a fechas serializadas (respaldos JSON viejos).
  return new Date(fecha).toLocaleTimeString('es-SV', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !formato24h,
  });
}

export function formatoFechaLegible(fecha: string): string {
  return parsearFechaLocal(fecha).toLocaleDateString('es-SV', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatoMoneda(monto: number): string {
  return monto.toLocaleString('es-SV', { style: 'currency', currency: 'USD' });
}

export function minutosAHoras(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas}h ${String(mins).padStart(2, '0')}m`;
}

/** Minutos -> "4:32" (para relojes y duraciones). */
export function duracionHHMM(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Horas decimales de nomina -> "4.25 h". */
export function horasDecimales(horas: number): string {
  return `${horas.toFixed(2)} h`;
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

/** "lun 05/01" */
export function fechaCorta(fecha: string): string {
  const d = parsearFechaLocal(fecha);
  return `${DIAS_CORTOS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Fecha y hora para <input type="datetime-local">. */
export function aDatetimeLocal(d: Date): string {
  return `${formatoFechaLocal(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function desdeDatetimeLocal(valor: string): Date {
  const [fecha, hora] = valor.split('T');
  const [a, m, d] = fecha!.split('-').map(Number);
  const [h, mi] = hora!.split(':').map(Number);
  return new Date(a!, m! - 1, d!, h!, mi!);
}
