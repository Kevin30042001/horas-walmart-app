import { CheckCircle2, Download, Share2, TriangleAlert } from 'lucide-react';
import type { useEntregaArchivo } from './useEntregaArchivo';

/** Resultado de generar un archivo: listo (descargar otra vez / compartir), aviso o error. */
export default function PanelArchivo({ entrega }: { entrega: ReturnType<typeof useEntregaArchivo> }) {
  const { archivo, error, aviso, generando, reintentar, compartir, sePuedeCompartir } = entrega;
  if (generando) return null;
  return (
    <div className="space-y-2">
      {aviso && <p className="rounded-2xl bg-elevada p-3 text-xs text-tenue">{aviso}</p>}
      {error && (
        <p className="flex gap-2 rounded-2xl bg-peligro/12 p-3 text-xs text-peligro">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      {archivo && (
        <div className="rounded-2xl border border-exito/40 bg-exito/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-exito" aria-hidden />
            <span className="truncate">{archivo.nombre}</span>
          </p>
          <p className="mt-0.5 text-xs text-tenue">
            Listo ({Math.max(1, Math.round(archivo.blob.size / 1024))} KB). Si no aparecio en Descargas, usa un boton:
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => void reintentar()} className="pulsable flex items-center justify-center gap-1.5 rounded-xl bg-elevada py-2 text-xs font-semibold">
              <Download className="h-4 w-4" aria-hidden /> Descargar
            </button>
            <button
              onClick={() => void compartir()}
              disabled={!sePuedeCompartir}
              className="pulsable flex items-center justify-center gap-1.5 rounded-xl bg-acento py-2 text-xs font-semibold text-sobre-acento disabled:opacity-40"
            >
              <Share2 className="h-4 w-4" aria-hidden /> Compartir / guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
