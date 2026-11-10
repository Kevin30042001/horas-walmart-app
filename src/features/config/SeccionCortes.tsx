import { useEffect, useState } from 'react';
import { CalendarCheck, Pencil, Trash2, Wallet } from 'lucide-react';
import { listarCortes, reemplazarCortesEnRango, actualizarCorte, eliminarCorte } from '../../data/repos/configRepo';
import { guardarPerfil, obtenerPerfil } from '../../data/repos/perfilRepo';
import { generarCortes, REGLA_CORTES_WALMART } from '../../domain/calculo/cortes';
import { recalcularTodasLasJornadas } from '../../aplicacion/recalcular';
import { useApp } from '../../aplicacion/AppContexto';
import { fechaCorta, fechaLocalHoy, formatoFechaLocal, parsearFechaLocal } from '../../utils/fecha';
import type { CorteRow } from '../../data/db';
import Boton from '../../components/Boton';
import Hoja from '../../components/Hoja';

function sumarMeses(fecha: string, meses: number): string {
  const d = parsearFechaLocal(fecha);
  d.setMonth(d.getMonth() + meses);
  return formatoFechaLocal(d);
}

/**
 * Calendario de cortes de Walmart. Por defecto: pago del 14 = del 20 del mes
 * anterior al 4; pago del 28 = del 5 al 19. Los dias se configuran y cada corte
 * se puede mover a mano (a veces corta el 17, 18 o 19, o el 4, 5 o 6).
 */
export default function SeccionCortes() {
  const { refrescar } = useApp();
  const [cortes, setCortes] = useState<CorteRow[]>([]);
  const [regla, setRegla] = useState(REGLA_CORTES_WALMART.cortes);
  const [desde, setDesde] = useState(sumarMeses(fechaLocalHoy(), -2));
  const [hasta, setHasta] = useState(sumarMeses(fechaLocalHoy(), 6));
  const [editando, setEditando] = useState<CorteRow | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const perfil = await obtenerPerfil();
      if (perfil.reglaCortes?.length) setRegla(perfil.reglaCortes);
      await cargar();
    })();
  }, []);

  async function cargar(): Promise<void> {
    setCortes(await listarCortes());
  }

  async function despuesDeCambio(texto: string): Promise<void> {
    await recalcularTodasLasJornadas(); // cada jornada vuelve a quedar en su corte
    await cargar();
    refrescar();
    setMensaje(texto);
  }

  async function generar(): Promise<void> {
    const reglaOrdenada = [...regla].sort((a, b) => a.diaCorte - b.diaCorte);
    await guardarPerfil({ reglaCortes: reglaOrdenada });
    const periodos = generarCortes(parsearFechaLocal(desde), parsearFechaLocal(hasta), { cortes: reglaOrdenada });
    await reemplazarCortesEnRango(desde, hasta, periodos);
    await despuesDeCambio(`Se generaron ${periodos.length} cortes.`);
  }

  async function guardarEdicion(): Promise<void> {
    if (!editando?.id) return;
    if (editando.fechaInicio > editando.fechaCorte) {
      setMensaje('La fecha de inicio debe ser antes del corte.');
      return;
    }
    await actualizarCorte(editando.id, {
      fechaInicio: editando.fechaInicio,
      fechaCorte: editando.fechaCorte,
      fechaPago: editando.fechaPago,
    });
    setEditando(null);
    await despuesDeCambio('Corte actualizado.');
  }

  const hoy = fechaLocalHoy();

  return (
    <div className="space-y-4">
      <div className="tarjeta space-y-3">
        <p className="etiqueta">Regla de cortes</p>
        {regla.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <label className="text-xs text-tenue">
              Corta el dia
              <input
                type="number"
                min={1}
                max={31}
                value={r.diaCorte}
                onChange={(e) => setRegla(regla.map((x, j) => (j === i ? { ...x, diaCorte: Number(e.target.value) || 1 } : x)))}
                className="campo num mt-1"
              />
            </label>
            <label className="text-xs text-tenue">
              Paga el dia
              <input
                type="number"
                min={1}
                max={31}
                value={r.diaPago}
                onChange={(e) => setRegla(regla.map((x, j) => (j === i ? { ...x, diaPago: Number(e.target.value) || 1 } : x)))}
                className="campo num mt-1"
              />
            </label>
          </div>
        ))}
        <p className="text-xs text-tenue">
          Ejemplo con 4 y 19: el pago del 14 cubre del 20 del mes anterior al 4, y el del 28 cubre del 5 al 19.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-tenue">
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="campo mt-1" />
          </label>
          <label className="text-xs text-tenue">
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="campo mt-1" />
          </label>
        </div>
        <Boton ancho icono={<CalendarCheck className="h-4 w-4" />} onClick={() => void generar()}>
          Generar cortes (reemplaza los de ese rango)
        </Boton>
      </div>

      {mensaje && <p className="text-xs text-exito">{mensaje}</p>}

      <div>
        <p className="etiqueta mb-2">Cortes ({cortes.length})</p>
        {cortes.length === 0 && <p className="text-sm text-tenue">Todavia no hay cortes. Generalos con la regla de arriba.</p>}
        <ul className="space-y-2">
          {[...cortes].reverse().map((c) => {
            const actual = c.fechaInicio <= hoy && hoy <= c.fechaCorte;
            return (
              <li key={c.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${actual ? 'border-acento bg-acento/10' : 'border-borde bg-superficie'}`}>
                <div className="flex-1">
                  <p className="num text-sm font-semibold">
                    {fechaCorta(c.fechaInicio)} al {fechaCorta(c.fechaCorte)} {actual && <span className="text-xs text-acentotx">(actual)</span>}
                  </p>
                  <p className="num flex items-center gap-1 text-xs text-tenue">
                    <Wallet className="h-3.5 w-3.5" aria-hidden /> Paga {fechaCorta(c.fechaPago)}
                  </p>
                </div>
                <button onClick={() => setEditando({ ...c })} aria-label="Editar corte" className="pulsable rounded-xl p-2 text-tenue hover:bg-elevada">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Eliminar este corte?')) void eliminarCorte(c.id!).then(() => despuesDeCambio('Corte eliminado.'));
                  }}
                  aria-label="Eliminar corte"
                  className="pulsable rounded-xl p-2 text-peligro hover:bg-peligro/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {editando && (
        <Hoja titulo="Ajustar corte" onCerrar={() => setEditando(null)}>
          <div className="space-y-3">
            {(['fechaInicio', 'fechaCorte', 'fechaPago'] as const).map((campo) => (
              <label key={campo} className="block text-xs text-tenue">
                {campo === 'fechaInicio' ? 'Inicio' : campo === 'fechaCorte' ? 'Corte (ultimo dia)' : 'Fecha de pago'}
                <input type="date" value={editando[campo]} onChange={(e) => setEditando({ ...editando, [campo]: e.target.value })} className="campo mt-1" />
              </label>
            ))}
            <p className="text-xs text-tenue">Ajusta solo este corte. Recuerda mover tambien el inicio del siguiente para que no queden dias sueltos.</p>
            <Boton ancho onClick={() => void guardarEdicion()}>
              Guardar
            </Boton>
          </div>
        </Hoja>
      )}
    </div>
  );
}
