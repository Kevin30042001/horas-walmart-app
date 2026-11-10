import type { ReactNode } from 'react';

type Tono = 'normal' | 'acento' | 'nocturno' | 'diurno' | 'exito' | 'aviso' | 'asueto';

const PUNTO: Record<Tono, string> = {
  normal: 'bg-tenue',
  acento: 'bg-acento',
  nocturno: 'bg-nocturno',
  diurno: 'bg-diurno',
  exito: 'bg-exito',
  aviso: 'bg-aviso',
  asueto: 'bg-asueto',
};

interface Props {
  titulo: string;
  valor: string;
  subtitulo?: string;
  tono?: Tono;
  icono?: ReactNode;
}

/** Tarjeta KPI: etiqueta pequena, valor grande con numeros tabulares. */
export default function Tarjeta({ titulo, valor, subtitulo, tono = 'normal', icono }: Props) {
  return (
    <div className="tarjeta">
      <p className="flex items-center gap-1.5 text-xs text-tenue">
        {icono ?? <span className={`h-2 w-2 rounded-full ${PUNTO[tono]}`} aria-hidden />}
        {titulo}
      </p>
      <p className="num mt-1 text-2xl font-semibold tracking-tight">{valor}</p>
      {subtitulo && <p className="text-xs text-tenue">{subtitulo}</p>}
    </div>
  );
}
