/**
 * Retencion de datos: decide que jornadas son candidatas a purgarse segun los
 * dias de retencion configurados. Logica pura y testeable -- la ejecucion
 * real (borrar de Dexie, archivar resumenes) vive en la capa de aplicacion.
 */
export interface JornadaParaRetencion {
  id: number;
  fecha: string; // yyyy-MM-dd
  protegida: boolean;
}

function restarDiasIso(fechaIso: string, dias: number): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  const fecha = new Date(anio!, mes! - 1, dia!);
  fecha.setDate(fecha.getDate() - dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

/**
 * Una jornada es candidata a purgarse si NO esta protegida y su fecha es
 * anterior al limite (hoy - diasRetencion).
 */
export function filtrarCandidatosAPurgar(
  jornadas: JornadaParaRetencion[],
  diasRetencion: number,
  hoyIso: string
): JornadaParaRetencion[] {
  const limite = restarDiasIso(hoyIso, diasRetencion);
  return jornadas.filter((j) => !j.protegida && j.fecha < limite);
}
