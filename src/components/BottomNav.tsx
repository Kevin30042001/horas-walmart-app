export type Pestana = 'inicio' | 'marcar' | 'registros' | 'reportes' | 'config';

const ITEMS: { id: Pestana; etiqueta: string }[] = [
  { id: 'inicio', etiqueta: 'Inicio' },
  { id: 'marcar', etiqueta: 'Marcar' },
  { id: 'registros', etiqueta: 'Registros' },
  { id: 'reportes', etiqueta: 'Reportes' },
  { id: 'config', etiqueta: 'Config' },
];

interface Props {
  pestanaActiva: Pestana;
  onCambiar: (pestana: Pestana) => void;
}

/** Navegacion inferior fija, pensada para uso con una mano. */
export default function BottomNav({ pestanaActiva, onCambiar }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onCambiar(item.id)}
          aria-current={pestanaActiva === item.id ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
            pestanaActiva === item.id ? 'font-semibold text-marca' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {item.etiqueta}
        </button>
      ))}
    </nav>
  );
}
