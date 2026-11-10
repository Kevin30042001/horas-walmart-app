import { useState } from 'react';
import { compartirArchivo, entregarArchivo, mensajeDeError, puedeCompartir, type ArchivoGenerado } from '../utils/entregarArchivo';

/**
 * Genera un archivo y lo entrega (descarga o guardado nativo), guardando el
 * resultado para poder volver a descargarlo o compartirlo con un toque, y el
 * error si algo falla (antes se perdia y solo se veia la animacion).
 */
export function useEntregaArchivo() {
  const [generando, setGenerando] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<ArchivoGenerado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function generar(id: string, crear: () => Promise<ArchivoGenerado | null>, siVacio?: string): Promise<void> {
    setGenerando(id);
    setError(null);
    setAviso(null);
    try {
      const nuevo = await crear();
      if (!nuevo) {
        setArchivo(null);
        setAviso(siVacio ?? 'No hay datos para generar este archivo.');
        return;
      }
      setArchivo(nuevo);
      try {
        await entregarArchivo(nuevo);
      } catch (e) {
        // si la descarga automatica falla, queda el boton para descargar o compartir manualmente
        setError(mensajeDeError(e));
      }
    } catch (e) {
      console.error(e);
      setError(mensajeDeError(e));
    } finally {
      setGenerando(null);
    }
  }

  async function reintentar(): Promise<void> {
    if (!archivo) return;
    setError(null);
    try {
      await entregarArchivo(archivo);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  async function compartir(): Promise<void> {
    if (!archivo) return;
    setError(null);
    try {
      await compartirArchivo(archivo);
    } catch (e) {
      const msg = mensajeDeError(e);
      if (!msg.includes('cancelo')) setError(msg);
    }
  }

  return { generando, archivo, error, aviso, generar, reintentar, compartir, sePuedeCompartir: archivo ? puedeCompartir(archivo) : false };
}
