import { useEffect, useState } from 'react';
import { listarCortes, agregarCortes } from '../../data/repos/configRepo';
import { generarCortes } from '../../domain/calculo/cortes';
import type { CorteRow } from '../../data/db';

export default function SeccionCortes() {
  const [cortes, setCortes] = useState<CorteRow[]>([]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    setCortes(await listarCortes());
  }

  async function generar(): Promise<void> {
    if (!desde || !hasta) return;
    const [ad, md, dd] = desde.split('-').map(Number);
    const [ah, mh, dh] = hasta.split('-').map(Number);
    const periodos = generarCortes(new Date(ad!, md! - 1, dd!), new Date(ah!, mh! - 1, dh!), {
      diasDeCorte: [14, 28],
      diasHastaPago: 3,
    });
    await agregarCortes(periodos);
    await cargar();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Genera cortes con la regla base (14 y 28). Walmart no siempre corta exacto esos dias -- despues puedes editar
        cualquier fecha individual sin romper el resto.
      </p>
      <div className="flex gap-2">
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="flex-1 rounded border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="flex-1 rounded border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <button onClick={() => void generar()} className="rounded bg-marca px-3 text-white">
          Generar
        </button>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {cortes.length === 0 && <li className="py-2 text-sm text-slate-400">Sin cortes generados todavia.</li>}
        {cortes.map((c) => (
          <li key={c.id} className="py-2 text-sm">
            {c.fechaInicio} al {c.fechaCorte} - paga {c.fechaPago} - {c.estado}
          </li>
        ))}
      </ul>
    </div>
  );
}
