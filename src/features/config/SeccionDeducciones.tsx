import { useEffect, useState } from 'react';
import { listarDeducciones, actualizarDeduccion } from '../../data/repos/configRepo';
import type { DeduccionRow } from '../../data/db';

export default function SeccionDeducciones() {
  const [deducciones, setDeducciones] = useState<DeduccionRow[]>([]);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    setDeducciones(await listarDeducciones());
  }

  async function alternar(id: number, activo: boolean): Promise<void> {
    await actualizarDeduccion(id, { activo });
    await cargar();
  }

  async function cambiarPorcentaje(id: number, valor: number): Promise<void> {
    await actualizarDeduccion(id, { valorPorcentaje: valor });
    await cargar();
  }

  return (
    <div className="space-y-3">
      <p className="rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        Estas son deducciones ESTIMADAS para una proyeccion personal. No reemplazan tu boleta oficial -- verifica las
        tasas de ISSS/AFP y la tabla de Impuesto de Renta vigentes antes de confiar en el neto calculado.
      </p>
      {deducciones.map((d) => (
        <div key={d.id} className="rounded-2xl border border-borde p-3 text-sm ">
          <div className="flex items-center justify-between">
            <p className="font-medium">{d.nombre}</p>
            <input
              type="checkbox"
              checked={d.activo}
              onChange={(e) => void alternar(d.id!, e.target.checked)}
              aria-label={`Activar ${d.nombre}`}
            />
          </div>
          {d.tipo === 'porcentaje' && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={d.valorPorcentaje ?? 0}
                onChange={(e) => void cambiarPorcentaje(d.id!, Number(e.target.value) || 0)}
                className="w-20 campo !w-auto !px-2 !py-1"
              />
              <span className="text-xs text-tenue">% {d.tope ? `(tope $${d.tope})` : '(sin tope)'}</span>
            </div>
          )}
          {d.tipo === 'tabla' && (
            <p className="mt-1 text-xs text-tenue">
              Tabla de tramos progresivos ({d.tramosIsr?.length ?? 0} tramos) -- edicion detallada proximamente.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
