import { useEffect, useState } from 'react';
import { listarJornadasEntre, marcarJornadaProtegida } from '../../data/repos/registrosRepo';
import { formatoFechaLegible, minutosAHoras } from '../../utils/fecha';
import { NOMBRE_TIPO_HORA } from '../../utils/nombresTipoHora';
import type { DesgloseMinutos } from '../../domain/tipos';
import type { JornadaRow } from '../../data/db';

function formatoISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function DetalleJornada({ jornada, onVolver }: { jornada: JornadaRow; onVolver: () => void }) {
  const [protegida, setProtegida] = useState(jornada.protegida);
  const entradas = Object.entries(jornada.desgloseMinutos) as [keyof DesgloseMinutos, number][];
  const conMinutos = entradas.filter(([, min]) => min > 0);

  async function alternarProteccion(): Promise<void> {
    const nuevoValor = !protegida;
    await marcarJornadaProtegida(jornada.id!, nuevoValor);
    setProtegida(nuevoValor);
  }

  return (
    <div className="p-4">
      <button onClick={onVolver} className="mb-3 text-sm font-medium text-marca">
        Volver
      </button>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-bold capitalize">{formatoFechaLegible(jornada.fecha)}</h2>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input type="checkbox" checked={protegida} onChange={() => void alternarProteccion()} />
          Proteger (no borrar en la limpieza)
        </label>
      </div>
      <p className="mb-4 text-sm text-slate-400">Por que se pago asi:</p>
      <ul className="space-y-2">
        {conMinutos.length === 0 && <li className="text-sm text-slate-400">Sin minutos registrados.</li>}
        {conMinutos.map(([tipo, minutos]) => (
          <li
            key={tipo}
            className="flex justify-between rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800"
          >
            <span>{NOMBRE_TIPO_HORA[tipo]}</span>
            <span className="font-semibold">{minutosAHoras(minutos)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RegistrosScreen() {
  const [jornadas, setJornadas] = useState<JornadaRow[]>([]);
  const [seleccionada, setSeleccionada] = useState<JornadaRow | null>(null);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    const hoy = new Date();
    const hace60 = new Date();
    hace60.setDate(hace60.getDate() - 60);
    const todas = await listarJornadasEntre(formatoISO(hace60), formatoISO(hoy));
    setJornadas(todas.reverse());
  }

  if (seleccionada) {
    return <DetalleJornada jornada={seleccionada} onVolver={() => setSeleccionada(null)} />;
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {jornadas.length === 0 && (
        <p className="p-6 text-center text-slate-400">Todavia no hay jornadas calculadas (marca entrada y salida).</p>
      )}
      {jornadas.map((j) => (
        <button
          key={j.id}
          onClick={() => setSeleccionada(j)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div>
            <p className="font-semibold capitalize">{formatoFechaLegible(j.fecha)}</p>
            <p className="text-xs text-slate-400">
              {j.esAsueto ? 'Asueto laborado' : j.esDescansoSemanalLaborado ? 'Descanso laborado' : `Jornada ${j.tipoJornadaLegal}`}
            </p>
          </div>
          <p className="text-sm font-semibold">{minutosAHoras(j.totalMinutosTrabajados)}</p>
        </button>
      ))}
    </div>
  );
}
