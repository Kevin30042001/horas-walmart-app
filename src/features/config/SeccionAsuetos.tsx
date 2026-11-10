import { useEffect, useState } from 'react';
import { listarAsuetos, agregarAsueto, eliminarAsueto } from '../../data/repos/configRepo';
import type { AsuetoRow } from '../../data/db';
import { recalcularTodasLasJornadas } from '../../aplicacion/recalcular';

export default function SeccionAsuetos() {
  const [asuetos, setAsuetos] = useState<AsuetoRow[]>([]);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    setAsuetos(await listarAsuetos());
  }

  async function agregar(): Promise<void> {
    if (!nuevaFecha || !nuevoNombre) return;
    await agregarAsueto({ fecha: nuevaFecha, nombre: nuevoNombre, ambito: 'local', esAutomatico: false });
    setNuevaFecha('');
    setNuevoNombre('');
    await recalcularTodasLasJornadas(); // las jornadas de ese dia pasan a pagarse como asueto
    await cargar();
  }

  async function eliminar(id: number): Promise<void> {
    await eliminarAsueto(id);
    await recalcularTodasLasJornadas();
    await cargar();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-tenue">
        Catalogo de asuetos (nacionales precargados + Semana Santa calculada automaticamente). Agrega los locales de tu
        division.
      </p>
      <div className="flex gap-2">
        <input
          type="date"
          value={nuevaFecha}
          onChange={(e) => setNuevaFecha(e.target.value)}
          className="campo"
        />
        <input
          type="text"
          placeholder="Nombre del asueto"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          className="flex-1 campo"
        />
        <button onClick={() => void agregar()} className="pulsable rounded-xl bg-acento px-3 font-semibold text-sobre-acento">
          Agregar
        </button>
      </div>
      <ul className="divide-y divide-borde">
        {asuetos.map((a) => (
          <li key={a.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <p>
                {a.fecha} - {a.nombre}
              </p>
              <p className="text-xs text-tenue">
                {a.ambito}
                {a.esAutomatico ? ' - automatico' : ''}
              </p>
            </div>
            <button onClick={() => void eliminar(a.id!)} className="text-xs text-peligro">
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
