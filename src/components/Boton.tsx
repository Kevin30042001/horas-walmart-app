import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  ancho?: boolean;
  icono?: ReactNode;
}

const ESTILOS: Record<Variante, string> = {
  primario: 'bg-acento text-sobre-acento shadow-lg shadow-acento/20',
  secundario: 'border border-borde bg-elevada text-texto',
  fantasma: 'text-acento',
  peligro: 'bg-peligro/15 text-peligro',
};

export default function Boton({ variante = 'primario', ancho, icono, className = '', children, ...resto }: Props) {
  return (
    <button
      {...resto}
      className={`pulsable inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-40 ${
        ESTILOS[variante]
      } ${ancho ? 'w-full' : ''} ${className}`}
    >
      {icono}
      {children}
    </button>
  );
}
