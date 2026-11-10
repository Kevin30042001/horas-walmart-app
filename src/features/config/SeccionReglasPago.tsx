import { useEffect, useState } from 'react';
import { listarReglasPago, actualizarRegla } from '../../data/repos/configRepo';
import type { ReglaPagoRow } from '../../data/db';

/**
 * Tabla editable de reglas de pago: una fila por linea de la boleta. Cada una
 * es un RECARGO (se suma sobre el salario, ej. Nocturnidad 25 %) o un PAGO
 * COMPLETO (la hora entera con su factor, ej. Horas Extras 200 %).
 */
export default function SeccionReglasPago() {
  const [reglas, setReglas] = useState<ReglaPagoRow[]>([]);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    setReglas(await listarReglasPago());
  }

  async function cambiar(id: number, cambios: Partial<ReglaPagoRow>): Promise<void> {
    await actualizarRegla(id, cambios);
    await cargar();
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Bruto = salario del corte + lineas. Recargo: horas x hora base x factor, sumado al salario. Pago completo: la
        hora entera con su factor.
      </p>
      {reglas.map((r) => (
        <div key={r.id} className="space-y-1 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
          <input
            value={r.nombreLinea}
            onChange={(e) => void cambiar(r.id!, { nombreLinea: e.target.value })}
            className="w-full bg-transparent font-medium"
          />
          <div className="flex items-center gap-2">
            <select
              value={r.modo}
              onChange={(e) => void cambiar(r.id!, { modo: e.target.value as ReglaPagoRow['modo'] })}
              className="rounded border border-slate-300 p-1 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="recargo">Recargo</option>
              <option value="completo">Pago completo</option>
            </select>
            <span className="text-xs text-slate-400">factor</span>
            <input
              type="number"
              step="0.05"
              value={r.factor}
              onChange={(e) => void cambiar(r.id!, { factor: Number(e.target.value) || 0 })}
              className="w-20 rounded border border-slate-300 p-1 text-right dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <p className="text-xs text-slate-400">
            {r.articuloLey}
            {r.diaCompensatorio ? ' - da derecho a dia compensatorio' : ''}
          </p>
        </div>
      ))}
    </div>
  );
}
