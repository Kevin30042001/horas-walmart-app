type Tono = 'normal' | 'alerta' | 'exito';

const BORDES: Record<Tono, string> = {
  normal: 'border-slate-200 dark:border-slate-700',
  alerta: 'border-amber-400',
  exito: 'border-emerald-400',
};

interface Props {
  titulo: string;
  valor: string;
  subtitulo?: string;
  tono?: Tono;
}

/** Tarjeta KPI reutilizable para Dashboard y Reportes. */
export default function Tarjeta({ titulo, valor, subtitulo, tono = 'normal' }: Props) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${BORDES[tono]}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{titulo}</p>
      <p className="text-2xl font-bold">{valor}</p>
      {subtitulo && <p className="text-xs text-slate-400">{subtitulo}</p>}
    </div>
  );
}
