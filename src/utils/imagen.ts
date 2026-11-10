/** Utilidades para la evidencia fotografica: hash de integridad + compresion a WebP. */

export async function calcularSha256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Comprime una imagen a WebP intentando no superar `tamanoMaximoBytes`
 * (~200KB por defecto), bajando la calidad en pasos hasta lograrlo o hasta
 * agotar los intentos.
 */
export async function comprimirAWebp(archivo: Blob, tamanoMaximoBytes = 200_000): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('No se pudo obtener el contexto 2D del canvas');
  contexto.drawImage(bitmap, 0, 0);

  let calidad = 0.85;
  let resultado: Blob | null = null;

  for (let intento = 0; intento < 6; intento++) {
    resultado = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', calidad)
    );
    if (!resultado) break;
    if (resultado.size <= tamanoMaximoBytes) break;
    calidad -= 0.15;
  }

  if (!resultado) throw new Error('No se pudo comprimir la imagen a WebP');
  return resultado;
}

/** Preprocesamiento simple para mejorar el OCR: escala de grises + contraste. */
export async function preprocesarParaOcr(archivo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas');
  ctx.drawImage(bitmap, 0, 0);

  const datos = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const CONTRASTE = 40; // -255..255
  const factor = (259 * (CONTRASTE + 255)) / (255 * (259 - CONTRASTE));

  for (let i = 0; i < datos.data.length; i += 4) {
    const gris = 0.299 * datos.data[i]! + 0.587 * datos.data[i + 1]! + 0.114 * datos.data[i + 2]!;
    const conContraste = factor * (gris - 128) + 128;
    const valor = Math.max(0, Math.min(255, conContraste));
    datos.data[i] = valor;
    datos.data[i + 1] = valor;
    datos.data[i + 2] = valor;
  }

  ctx.putImageData(datos, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar el blob preprocesado'))), 'image/png');
  });
}
