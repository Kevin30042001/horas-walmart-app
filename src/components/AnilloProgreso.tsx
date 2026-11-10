import type { ReactNode } from 'react';

interface Props {
  /** 0..1 de lo programado; puede pasar de 1 (extras). */
  progreso: number;
  tamano?: number;
  grosor?: number;
  children?: ReactNode;
}

/**
 * Anillo de progreso de la jornada. Si se pasa de lo programado, un segundo
 * arco (color aviso) muestra el tiempo extra encima del anillo completo.
 */
export default function AnilloProgreso({ progreso, tamano = 260, grosor = 14, children }: Props) {
  const r = (tamano - grosor) / 2;
  const c = 2 * Math.PI * r;
  const base = Math.min(Math.max(progreso, 0), 1);
  const extra = Math.min(Math.max(progreso - 1, 0), 1);

  return (
    <div className="relative" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} className="-rotate-90" aria-hidden>
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" strokeWidth={grosor} className="stroke-elevada" />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - base)}
          className="stroke-acento transition-[stroke-dashoffset] duration-700"
        />
        {extra > 0 && (
          <circle
            cx={tamano / 2}
            cy={tamano / 2}
            r={r}
            fill="none"
            strokeWidth={grosor / 2}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - extra)}
            className="stroke-aviso transition-[stroke-dashoffset] duration-700"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
