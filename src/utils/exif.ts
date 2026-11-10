export interface FechaCaptura {
  fecha: Date;
  /** 'exif' = fecha real de la camara; 'archivo' = fecha de modificacion (respaldo menos confiable). */
  fuente: 'exif' | 'archivo';
}

/**
 * Lee la fecha de captura real de la foto (EXIF DateTimeOriginal/CreateDate)
 * con `exifr` (ligero, gratis, 100 % en el dispositivo). Si la foto no trae
 * EXIF (capturas de pantalla, fotos reenviadas por WhatsApp...), usa la fecha
 * de modificacion del archivo.
 */
export async function leerFechaCaptura(archivo: File): Promise<FechaCaptura> {
  try {
    const exifr = (await import('exifr')).default;
    const datos = (await exifr.parse(archivo, ['DateTimeOriginal', 'CreateDate'])) as
      | { DateTimeOriginal?: Date; CreateDate?: Date }
      | undefined;
    const fecha = datos?.DateTimeOriginal ?? datos?.CreateDate;
    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) return { fecha, fuente: 'exif' };
  } catch {
    // sin EXIF legible: se usa el respaldo
  }
  return { fecha: new Date(archivo.lastModified), fuente: 'archivo' };
}
