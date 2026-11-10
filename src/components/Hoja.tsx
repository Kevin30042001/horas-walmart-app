import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

/** Hoja inferior (bottom sheet): el patron nativo para formularios cortos con una mano. */
export default function Hoja({ titulo, onCerrar, children }: Props) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onCerrar} />
      <div className="pb-segura relative max-h-[92vh] w-full max-w-md animate-aparecer overflow-y-auto rounded-t-4xl border border-borde bg-superficie px-5 pt-3 sm:rounded-4xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-borde sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="pulsable rounded-full p-1.5 text-tenue hover:bg-elevada">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="pb-4">{children}</div>
      </div>
    </div>
  );
}
