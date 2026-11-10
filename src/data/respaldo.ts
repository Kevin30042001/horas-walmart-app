import { db } from './db';

const NOMBRES_TABLAS = [
  'perfil',
  'turnos',
  'rotaciones',
  'registros',
  'jornadas',
  'fotos',
  'reglasPago',
  'asuetos',
  'cortes',
  'deducciones',
  'resumenesHistoricos',
  'configRetencion',
] as const;

type NombreTabla = (typeof NOMBRES_TABLAS)[number];

interface RespaldoJSON {
  version: 1;
  creadoEn: string;
  tablas: Partial<Record<NombreTabla, unknown[]>>;
}

async function blobABase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function base64ABlob(base64: string, tipo = 'image/webp'): Blob {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/**
 * Genera un respaldo completo de la base de datos en JSON (incluye fotos
 * codificadas en base64). Es el formato que usa tanto el respaldo manual de
 * Configuracion como el respaldo automatico antes de la limpieza por retencion.
 */
export async function generarRespaldoJSON(): Promise<Blob> {
  const tablas: RespaldoJSON['tablas'] = {};

  for (const nombre of NOMBRES_TABLAS) {
    // Se accede dinamicamente porque este modulo recorre TODAS las tablas de
    // forma homogenea (respaldo/restauracion generico); el resto del codigo
    // siempre usa los repositorios tipados en src/data/repos.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filas = await (db as any)[nombre].toArray();
    if (nombre === 'fotos') {
      tablas[nombre] = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filas.map(async (f: any) => ({ ...f, blobWebp: await blobABase64(f.blobWebp) }))
      );
    } else {
      tablas[nombre] = filas;
    }
  }

  const respaldo: RespaldoJSON = { version: 1, creadoEn: new Date().toISOString(), tablas };
  return new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
}

const CAMPOS_FECHA_POR_TABLA: Partial<Record<NombreTabla, string[]>> = {
  registros: ['horaReal', 'horaPlanificada'],
  jornadas: ['entradaReal', 'salidaReal'],
  fotos: ['exifFecha', 'creadoEn'],
  resumenesHistoricos: ['fechaArchivado'],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reconstruirFechas(nombreTabla: NombreTabla, fila: any): any {
  const campos = CAMPOS_FECHA_POR_TABLA[nombreTabla];
  if (!campos) return fila;
  const copia = { ...fila };
  for (const campo of campos) {
    if (copia[campo]) copia[campo] = new Date(copia[campo]);
  }
  return copia;
}

/**
 * Restaura un respaldo generado por `generarRespaldoJSON`, REEMPLAZANDO todo
 * el contenido actual de la base de datos. Se usa dentro de una transaccion
 * para que, si algo falla a medio camino, no quede la base en un estado mixto.
 */
export async function restaurarDesdeJSON(archivo: File): Promise<void> {
  const texto = await archivo.text();
  const respaldo = JSON.parse(texto) as RespaldoJSON;
  if (respaldo.version !== 1) throw new Error('Version de respaldo no soportada');

  await db.transaction('rw', db.tables, async () => {
    for (const nombre of NOMBRES_TABLAS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tabla = (db as any)[nombre];
      await tabla.clear();
      const filas = respaldo.tablas[nombre] ?? [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filasProcesadas = filas.map((fila: any) => {
        const conFechas = reconstruirFechas(nombre, fila);
        if (nombre === 'fotos') return { ...conFechas, blobWebp: base64ABlob(conFechas.blobWebp) };
        return conFechas;
      });

      if (filasProcesadas.length > 0) await tabla.bulkAdd(filasProcesadas);
    }
  });
}

/** Dispara la descarga del archivo de respaldo en el navegador. */
export function descargarRespaldo(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `mis-horas-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  enlace.click();
  URL.revokeObjectURL(url);
}
