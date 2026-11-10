import { db } from '../data/db';
import { generarRespaldoJSON } from '../data/respaldo';
import { listarCortes } from '../data/repos/configRepo';
import { calcularResumenCorte } from './resumenCorte';
import { construirDatosExportacion } from './reportes';

/**
 * Respaldo completo en ZIP: el JSON restaurable + Excel y PDF de cada corte
 * con jornadas + todas las fotos de evidencia (WebP). Se ofrece 7 dias antes
 * de la limpieza automatica y en Configuracion > Datos y respaldo.
 */
export async function generarRespaldoZip(): Promise<Blob> {
  const [{ default: JSZip }, { libroCorteABuffer }, { construirPdfCorte }] = await Promise.all([
    import('jszip'),
    import('../utils/export/excel'),
    import('../utils/export/pdf'),
  ]);
  const zip = new JSZip();
  zip.file('mis-horas-respaldo.json', await generarRespaldoJSON());

  for (const corte of await listarCortes()) {
    const resumen = await calcularResumenCorte(corte.id!);
    if (resumen.jornadas.length === 0) continue;
    const datos = await construirDatosExportacion(resumen);
    if (!datos) continue;
    zip.file(`cortes/MisHoras_${datos.etiquetaCorte}.xlsx`, await libroCorteABuffer(datos));
    zip.file(`cortes/MisHoras_${datos.etiquetaCorte}.pdf`, (await construirPdfCorte(datos)).output('arraybuffer'));
  }

  for (const foto of await db.fotos.toArray()) {
    const registro = await db.registros.get(foto.registroId);
    const nombre = registro ? `${registro.fecha}_${registro.tipoEvento}_${foto.id}` : `foto_${foto.id}`;
    zip.file(`fotos/${nombre}.webp`, foto.blobWebp);
  }
  return zip.generateAsync({ type: 'blob' });
}

export async function descargarRespaldoZip(): Promise<void> {
  const blob = await generarRespaldoZip();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mis-horas-respaldo-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
