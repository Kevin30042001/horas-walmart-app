/**
 * Compara la hora leida por OCR contra el momento de captura del archivo
 * (lastModified del File, usado como aproximacion razonable a la hora de
 * captura cuando no se dispone de un parser EXIF completo) y avisa si
 * difieren mas de la tolerancia configurada.
 */
export function hayDiscrepanciaHoraria(
  fechaOcr: string,
  horaOcr: string,
  momentoCaptura: Date,
  toleranciaMin = 15
): boolean {
  const [anio, mes, dia] = fechaOcr.split('-').map(Number);
  const [hora, minuto] = horaOcr.split(':').map(Number);
  const horaSegunOcr = new Date(anio!, mes! - 1, dia!, hora!, minuto!);
  const diferenciaMin = Math.abs(horaSegunOcr.getTime() - momentoCaptura.getTime()) / 60_000;
  return diferenciaMin > toleranciaMin;
}
