import { CircleHelp } from 'lucide-react';
import Chispa from './Chispa';

/** Barra superior con la marca: chispa amarilla + "Mis Horas" + aviso de app no oficial. */
export default function BarraSuperior({ onAyuda }: { onAyuda?: () => void }) {
  return (
    <header className="pt-segura sticky top-0 z-20 border-b border-borde/60 bg-fondo/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center gap-2.5 px-4 pb-2">
        <Chispa className="h-7 w-7 shrink-0" />
        <div className="flex-1 leading-tight">
          <p className="font-display text-base font-bold tracking-tight">
            Mis Horas<span className="text-amarillo">.</span>
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tenue">Uso personal · no oficial</p>
        </div>
        {onAyuda && (
          <button
            onClick={onAyuda}
            aria-label="Ayuda: ver la guia de esta pantalla"
            className="pulsable flex items-center gap-1 rounded-full border border-borde px-3 py-1.5 text-xs font-semibold text-tenue"
          >
            <CircleHelp className="h-4 w-4 text-acentotx" aria-hidden /> Guía
          </button>
        )}
      </div>
    </header>
  );
}
