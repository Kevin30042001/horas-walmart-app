import { Capacitor } from '@capacitor/core';

export interface ArchivoGenerado {
  blob: Blob;
  nombre: string;
}

export type ResultadoEntrega = 'descargado' | 'compartido' | 'guardado-app';

async function blobABase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

/** APK (Capacitor): el WebView no descarga blobs; se guarda el archivo y se abre el menu de compartir. */
async function entregarNativo({ blob, nombre }: ArchivoGenerado): Promise<ResultadoEntrega> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const { uri } = await Filesystem.writeFile({
    path: nombre,
    data: await blobABase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  await Share.share({ title: nombre, files: [uri], dialogTitle: 'Guardar o enviar el archivo' });
  return 'guardado-app';
}

/**
 * Descarga en el navegador. El enlace se agrega a la pagina antes del clic
 * (algunos navegadores moviles ignoran el clic en un enlace suelto) y la URL
 * se libera despues de un minuto (si se libera antes, la descarga puede fallar).
 */
function descargarWeb({ blob, nombre }: ArchivoGenerado): ResultadoEntrega {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
  return 'descargado';
}

/** Entrega un archivo generado: guardado nativo en el APK, descarga en el navegador. */
export async function entregarArchivo(archivo: ArchivoGenerado): Promise<ResultadoEntrega> {
  if (Capacitor.isNativePlatform()) return entregarNativo(archivo);
  return descargarWeb(archivo);
}

/** El navegador puede compartir este archivo (menu de Android/iPhone: Drive, WhatsApp, Archivos...). */
export function puedeCompartir(archivo: ArchivoGenerado): boolean {
  if (Capacitor.isNativePlatform()) return true;
  try {
    const file = new File([archivo.blob], archivo.nombre, { type: archivo.blob.type });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Abre el menu de compartir (debe llamarse desde un toque del usuario). */
export async function compartirArchivo(archivo: ArchivoGenerado): Promise<ResultadoEntrega> {
  if (Capacitor.isNativePlatform()) return entregarNativo(archivo);
  const file = new File([archivo.blob], archivo.nombre, { type: archivo.blob.type });
  await navigator.share({ files: [file], title: archivo.nombre });
  return 'compartido';
}

/** Mensaje entendible a partir de un error al generar o guardar. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof DOMException && e.name === 'AbortError') return 'Se cancelo el envio.';
  const texto = e instanceof Error ? e.message : String(e);
  return `No se pudo generar el archivo: ${texto}`;
}
