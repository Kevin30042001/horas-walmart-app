import { Monitor, Moon, Sun } from 'lucide-react';
import { guardarPerfil } from '../../data/repos/perfilRepo';
import { useApp } from '../../aplicacion/AppContexto';
import type { PerfilRow } from '../../data/db';

const TEMAS: { id: PerfilRow['tema']; etiqueta: string; Icono: typeof Sun }[] = [
  { id: 'oscuro', etiqueta: 'Oscuro', Icono: Moon },
  { id: 'claro', etiqueta: 'Claro', Icono: Sun },
  { id: 'auto', etiqueta: 'Sistema', Icono: Monitor },
];

/** Tema (oscuro por defecto, util de madrugada) y formato de hora 12 h / 24 h. */
export default function SeccionApariencia() {
  const { perfil, refrescar } = useApp();
  if (!perfil) return null;

  async function cambiar(cambios: Partial<PerfilRow>): Promise<void> {
    await guardarPerfil(cambios);
    refrescar();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="etiqueta mb-2">Tema</p>
        <div className="grid grid-cols-3 gap-2">
          {TEMAS.map(({ id, etiqueta, Icono }) => (
            <button
              key={id}
              onClick={() => void cambiar({ tema: id })}
              aria-pressed={perfil.tema === id}
              className={`pulsable flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs font-semibold ${
                perfil.tema === id ? 'border-acento bg-acento/10 text-acentotx' : 'border-borde text-tenue'
              }`}
            >
              <Icono className="h-5 w-5" /> {etiqueta}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="etiqueta mb-2">Formato de hora</p>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => void cambiar({ formato24h: v })}
              aria-pressed={perfil.formato24h === v}
              className={`pulsable num rounded-2xl border p-3 text-sm font-semibold ${
                perfil.formato24h === v ? 'border-acento bg-acento/10 text-acentotx' : 'border-borde text-tenue'
              }`}
            >
              {v ? '24 h (21:00)' : '12 h (9:00 p. m.)'}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-tenue">El color de acento sigue a tu turno activo: violeta en turnos nocturnos, ambar en diurnos.</p>
    </div>
  );
}
