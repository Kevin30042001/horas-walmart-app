import { useEffect, useState } from 'react';
import { listarReglasPago, actualizarFactorRegla } from '../../data/repos/configRepo';
import { NOMBRE_TIPO_HORA } from '../../utils/nombresTipoHora';
import type { ReglaPagoRow } from '../../data/db';

export default function SeccionReglasPago() {
  const [reglas, setReglas] = useState<ReglaPagoRow[]>([]);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    setReglas(await listarReglasPago());
  }

  async function cambiarFactor(id: number, factor: number): Promise<void> {
    await actualizarFactorRegla(id, factor);
    await cargar();
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Factores sobre la hora base diurna (Codigo de Trabajo de El Salvador). Editalos si tu division paga distinto.
      </p>
      {reglas.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
        >
          <div>
            <p className="font-medium">{NOMBRE_TIPO_HORA[r.tipoHora]}</p>
            <p className="text-xs text-slate-400">{r.articuloLey}</p>
          </div>
          <input
            type="number"
            step="0.05"
            value={r.factor}
            onChange={(e) => void cambiarFactor(r.id!, Number(e.target.value) || 0)}
            className="w-20 rounded border border-slate-300 p-1 text-right dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      ))}
    </div>
  );
}
