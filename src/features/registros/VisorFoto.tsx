import { useEffect, useState } from 'react';
import { ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { obtenerFoto } from '../../data/repos/registrosRepo';
import type { FotoRow } from '../../data/db';
import { useApp } from '../../aplicacion/AppContexto';

/** Foto de evidencia en pantalla completa, con su hash SHA-256 y la fecha de captura. */
export default function VisorFoto({ fotoId, onCerrar }: { fotoId: number; onCerrar: () => void }) {
  const { hora } = useApp();
  const [foto, setFoto] = useState<FotoRow | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let creada: string | null = null;
    void obtenerFoto(fotoId).then((f) => {
      if (!f) return;
      setFoto(f);
      creada = URL.createObjectURL(f.blobWebp);
      setUrl(creada);
    });
    return () => {
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [fotoId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Foto de evidencia">
      <button onClick={onCerrar} aria-label="Cerrar" className="pt-segura absolute right-3 top-0 z-10 rounded-full bg-black/60 p-2 text-white">
        <X className="h-6 w-6" />
      </button>
      <div className="flex flex-1 items-center justify-center overflow-auto">
        {url && <img src={url} alt="Evidencia del marcado" className="max-h-full max-w-full object-contain" />}
      </div>
      {foto && (
        <div className="pb-segura space-y-1 bg-black/80 px-4 pt-3 text-xs text-white/80">
          <p className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" aria-hidden /> SHA-256: <span className="num truncate">{foto.hashSha256}</span>
          </p>
          {foto.exifFecha && <p>Capturada: {foto.exifFecha.toLocaleDateString('es-SV')} {hora(foto.exifFecha)}</p>}
          <p className="num">{Math.round(foto.tamanoBytes / 1024)} KB (WebP)</p>
          {foto.discrepancia && (
            <p className="flex items-center gap-1 text-amber-300">
              <TriangleAlert className="h-4 w-4" aria-hidden /> La hora leida no coincidia con la hora de captura.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
