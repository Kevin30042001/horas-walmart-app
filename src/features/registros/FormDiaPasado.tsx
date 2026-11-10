import { useEffect, useState } from 'react';
import { agregarDiaPasado, JornadaYaExisteError } from '../../aplicacion/operacionesJornada';
import { horarioDelDia } from '../../aplicacion/marcado';
import { obtenerTurnoVigente } from '../../data/repos/perfilRepo';
import { fechaLocalHoy } from '../../utils/fecha';
import Hoja from '../../components/Hoja';
import Boton from '../../components/Boton';

/** Agregar un dia pasado a mano. Propone el horario programado de ese dia segun su turno. */
export default function FormDiaPasado({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const [fecha, setFecha] = useState(`${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`);
  const [entrada, setEntrada] = useState('');
  const [salida, setSalida] = useState('');
  const [conReceso, setConReceso] = useState(false);
  const [recesoIni, setRecesoIni] = useState('00:00');
  const [recesoFin, setRecesoFin] = useState('01:00');
  const [nota, setNota] = useState('');
  const [turnoNombre, setTurnoNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmarReemplazo, setConfirmarReemplazo] = useState(false);

  useEffect(() => {
    void (async () => {
      const turno = await obtenerTurnoVigente(fecha);
      setTurnoNombre(turno?.nombre ?? '');
      const h = horarioDelDia(turno, fecha);
      if (h) {
        setEntrada(h.horaEntrada);
        setSalida(h.horaSalida);
        setConReceso(Boolean(h.receso));
        if (h.receso) {
          setRecesoIni(h.receso.inicio);
          setRecesoFin(h.receso.fin);
        }
      }
    })();
  }, [fecha]);

  async function guardar(reemplazar = false): Promise<void> {
    setError(null);
    try {
      await agregarDiaPasado(
        { fecha, entrada, salida, receso: conReceso ? { inicio: recesoIni, fin: recesoFin } : null },
        nota,
        reemplazar
      );
      onGuardado();
    } catch (e) {
      if (e instanceof JornadaYaExisteError) setConfirmarReemplazo(true);
      else setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  }

  return (
    <Hoja titulo="Agregar dia pasado" onCerrar={onCerrar}>
      <div className="space-y-3">
        <label className="block text-xs text-tenue">
          Fecha de la jornada (dia de ENTRADA)
          <input type="date" value={fecha} max={fechaLocalHoy()} onChange={(e) => setFecha(e.target.value)} className="campo mt-1" />
        </label>
        {turnoNombre && <p className="text-xs text-tenue">Turno de ese dia: <strong className="text-texto">{turnoNombre}</strong>. Se propone su horario programado.</p>}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-tenue">
            Entrada
            <input type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} className="campo mt-1" />
          </label>
          <label className="text-xs text-tenue">
            Salida
            <input type="time" value={salida} onChange={(e) => setSalida(e.target.value)} className="campo mt-1" />
          </label>
        </div>
        <p className="text-[11px] text-tenue">Si la salida es menor que la entrada, cae al dia siguiente (turno nocturno).</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={conReceso} onChange={(e) => setConReceso(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--c-acento))]" />
          Tome receso
        </label>
        {conReceso && (
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={recesoIni} onChange={(e) => setRecesoIni(e.target.value)} className="campo" aria-label="Inicio del receso" />
            <input type="time" value={recesoFin} onChange={(e) => setRecesoFin(e.target.value)} className="campo" aria-label="Fin del receso" />
          </div>
        )}
        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional)" className="campo" />
        {error && <p className="text-xs text-peligro">{error}</p>}
        {confirmarReemplazo ? (
          <div className="space-y-2 rounded-2xl bg-aviso/12 p-3 text-sm">
            <p>Ya hay marcas para ese dia. Reemplazarlas por estas?</p>
            <div className="flex gap-2">
              <Boton variante="peligro" onClick={() => void guardar(true)}>Reemplazar</Boton>
              <Boton variante="fantasma" onClick={() => setConfirmarReemplazo(false)}>Cancelar</Boton>
            </div>
          </div>
        ) : (
          <Boton ancho disabled={!entrada || !salida} onClick={() => void guardar()}>
            Guardar y calcular
          </Boton>
        )}
      </div>
    </Hoja>
  );
}
