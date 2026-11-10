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

export function formatoHora(fecha: Date, formato24h = true): string {
  return fecha.toLocaleTimeString('es-SV', {
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
