import { CalendarDays, Clock3, LayoutGrid, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';

export type Pestana = 'marcar' | 'pago' | 'registros' | 'mas';

const ITEMS: { id: Pestana; etiqueta: string; Icono: ComponentType<{ className?: string }> }[] = [
  { id: 'marcar', etiqueta: 'Marcar', Icono: Clock3 },
  { id: 'pago', etiqueta: 'Pago', Icono: Wallet },
  { id: 'registros', etiqueta: 'Registros', Icono: CalendarDays },
  { id: 'mas', etiqueta: 'Mas', Icono: LayoutGrid },
];

interface Props {
  pestanaActiva: Pestana;
  onCambiar: (pestana: Pestana) => void;
}

/** Navegacion inferior con 4 pestanas, respetando el area segura de Android/iPhone. */
export default function BottomNav({ pestanaActiva, onCambiar }: Props) {
  return (
    <nav className="pb-segura fixed inset-x-0 bottom-0 z-30 border-t border-borde/70 bg-superficie/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md">
        {ITEMS.map(({ id, etiqueta, Icono }) => {
          const activa = pestanaActiva === id;
          return (
            <button
              key={id}
              onClick={() => onCambiar(id)}
              aria-current={activa ? 'page' : undefined}
              className={`pulsable flex flex-1 flex-col items-center gap-1 pb-1 pt-2 text-[11px] font-semibold ${
                activa ? 'text-acento' : 'text-tenue'
              }`}
            >
              <span className={`rounded-full px-4 py-1 transition ${activa ? 'bg-acento/15' : ''}`}>
                <Icono className="h-5 w-5" />
              </span>
              {etiqueta}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
