import { useEffect, useState } from 'react';
import {
  listarTurnos,
  guardarTurno,
  eliminarTurno,
  obtenerTurnoActivo,
  registrarRotacion,
  obtenerPerfil,
  aplicarHorarioReal,
  descartarHorarioRealPendiente,
} from '../../data/repos/perfilRepo';
import { minutosProgramados, minutosProgramadosSemana } from '../../domain/horario/ventana';
import { fechaLocalHoy } from '../../utils/fecha';
import { recalcularTodasLasJornadas } from '../../aplicacion/recalcular';
import type { HorarioDia, TurnoRow } from '../../data/db';
import VistaSemanal from './VistaSemanal';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function turnoEnBlanco(): TurnoRow {
  return {
    nombre: '',
    tipoBase: 'DIURNO',
    horarioPorDia: [],
    horasSemanales: 44,
    diaInicioSemana: 0,
    diaLibre: 0,
    vigenteDesde: '2020-01-01',
    vigenteHasta: null,
  };
}

function horarioDeDia(turno: TurnoRow, diaSemana: number): HorarioDia | undefined {
  return turno.horarioPorDia.find((h) => h.diaSemana === diaSemana);
}

function EditorTurno({ turno, onCancelar, onGuardado }: { turno: TurnoRow; onCancelar: () => void; onGuardado: () => void }) {
  const [editando, setEditando] = useState(turno);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function alternarDia(diaSemana: number, activo: boolean): void {
    const resto = editando.horarioPorDia.filter((h) => h.diaSemana !== diaSemana);
    if (!activo) {
      setEditando({ ...editando, horarioPorDia: resto });
      return;
    }
    setEditando({
      ...editando,
      horarioPorDia: [...resto, { diaSemana, horaEntrada: '08:00', horaSalida: '17:00', receso: null }].sort(
        (a, b) => a.diaSemana - b.diaSemana
      ),
    });
  }

  function cambiarReceso(diaSemana: number, receso: HorarioDia['receso']): void {
    setEditando({
      ...editando,
      horarioPorDia: editando.horarioPorDia.map((h) => (h.diaSemana === diaSemana ? { ...h, receso } : h)),
    });
  }

  function cambiarHorario(diaSemana: number, campo: 'horaEntrada' | 'horaSalida', valor: string): void {
    setEditando({
      ...editando,
      horarioPorDia: editando.horarioPorDia.map((h) => (h.diaSemana === diaSemana ? { ...h, [campo]: valor } : h)),
    });
  }

  async function guardar(): Promise<void> {
    if (!editando.nombre.trim()) {
      setMensaje('Ponele un nombre al turno.');
      return;
    }
    await guardarTurno(editando);
    await recalcularTodasLasJornadas();
    onGuardado();
  }

  return (
    <div className="space-y-3">
      <button onClick={onCancelar} className="text-sm font-medium text-acento">
        Volver
      </button>

      <input
        value={editando.nombre}
        onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
        placeholder="Nombre del turno (ej. DESPACHO)"
        className="w-full campo"
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={editando.tipoBase}
          onChange={(e) => setEditando({ ...editando, tipoBase: e.target.value as 'DIURNO' | 'NOCTURNO' })}
          className="campo"
        >
          <option value="DIURNO">Diurno</option>
          <option value="NOCTURNO">Nocturno</option>
        </select>
        <input
          type="number"
          value={editando.horasSemanales}
          onChange={(e) => setEditando({ ...editando, horasSemanales: Number(e.target.value) || 0 })}
          placeholder="Horas semanales"
          className="campo"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-tenue">Inicio de semana (tope legal)</label>
          <select
            value={editando.diaInicioSemana}
            onChange={(e) => setEditando({ ...editando, diaInicioSemana: Number(e.target.value) })}
            className="w-full campo"
          >
            {DIAS_SEMANA.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-tenue">Dia libre</label>
          <select
            value={editando.diaLibre}
            onChange={(e) => setEditando({ ...editando, diaLibre: Number(e.target.value) })}
            className="w-full campo"
          >
            {DIAS_SEMANA.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase text-tenue">
        Horario por dia - total {(minutosProgramadosSemana(editando.horarioPorDia) / 60).toFixed(2)} h/semana
      </p>
      <div className="tarjeta">
        <VistaSemanal
          horario={editando.horarioPorDia}
          onElegir={(d) => document.getElementById(`dia-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        />
      </div>
      <p className="text-xs text-tenue">
        Si la salida es antes que la entrada (ej. 20:00 a 04:00) se asume que cruza la medianoche.
      </p>
      <div className="space-y-1">
        {DIAS_SEMANA.map((nombreDia, diaSemana) => {
          const horario = horarioDeDia(editando, diaSemana);
          return (
            <div
              key={diaSemana}
              id={`dia-${diaSemana}`}
              className="flex flex-wrap items-center gap-2 rounded border border-borde p-2 text-xs "
            >
              <label className="flex w-24 items-center gap-1">
                <input type="checkbox" checked={!!horario} onChange={(e) => alternarDia(diaSemana, e.target.checked)} />
                {nombreDia}
              </label>
              {horario && (
                <>
                  <input
                    type="time"
                    value={horario.horaEntrada}
                    onChange={(e) => cambiarHorario(diaSemana, 'horaEntrada', e.target.value)}
                    className="campo !w-auto !px-2 !py-1"
                  />
                  <span>a</span>
                  <input
                    type="time"
                    value={horario.horaSalida}
                    onChange={(e) => cambiarHorario(diaSemana, 'horaSalida', e.target.value)}
                    className="campo !w-auto !px-2 !py-1"
                  />
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!horario.receso}
                      onChange={(e) =>
                        cambiarReceso(diaSemana, e.target.checked ? { inicio: '00:00', fin: '01:00' } : null)
                      }
                    />
                    receso
                  </label>
                  {horario.receso && (
                    <>
                      <input
                        type="time"
                        value={horario.receso.inicio}
                        onChange={(e) => cambiarReceso(diaSemana, { ...horario.receso!, inicio: e.target.value })}
                        className="campo !w-auto !px-2 !py-1"
                      />
                      <span>a</span>
                      <input
                        type="time"
                        value={horario.receso.fin}
                        onChange={(e) => cambiarReceso(diaSemana, { ...horario.receso!, fin: e.target.value })}
                        className="campo !w-auto !px-2 !py-1"
                      />
                    </>
                  )}
                  <span className="ml-auto text-tenue">{(minutosProgramados(horario) / 60).toFixed(2)} h</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {mensaje && <p className="text-xs text-peligro">{mensaje}</p>}
      <button onClick={() => void guardar()} className="pulsable w-full rounded-2xl bg-acento py-3 font-semibold text-sobre-acento">
        Guardar turno
      </button>
    </div>
  );
}

export default function SeccionTurnos() {
  const [turnos, setTurnos] = useState<TurnoRow[]>([]);
  const [turnoActivoId, setTurnoActivoId] = useState<number | null>(null);
  const [editando, setEditando] = useState<TurnoRow | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [fechaRotacion, setFechaRotacion] = useState(fechaLocalHoy());
  const [horarioPendiente, setHorarioPendiente] = useState(false);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    setTurnos(await listarTurnos());
    const activo = await obtenerTurnoActivo();
    setTurnoActivoId(activo?.id ?? null);
    setHorarioPendiente((await obtenerPerfil()).horarioRealPendiente);
  }

  async function decidirHorarioReal(aplicar: boolean): Promise<void> {
    if (aplicar) {
      await aplicarHorarioReal();
      await recalcularTodasLasJornadas();
    }
    else await descartarHorarioRealPendiente();
    setMensaje(aplicar ? 'Horario real aplicado a DESPACHO y RECIBO.' : 'Se conserva tu horario actual.');
    await cargar();
  }

  async function eliminar(id: number): Promise<void> {
    const resultado = await eliminarTurno(id);
    setMensaje(resultado.ok ? 'Turno eliminado.' : (resultado.motivo ?? 'No se pudo eliminar.'));
    await cargar();
  }

  async function rotar(turnoId: number): Promise<void> {
    await registrarRotacion({ fecha: fechaRotacion, turnoId, nota: '' });
    await recalcularTodasLasJornadas();
    setMensaje('Rotacion registrada.');
    await cargar();
  }

  if (editando) {
    return (
      <EditorTurno
        turno={editando}
        onCancelar={() => setEditando(null)}
        onGuardado={() => {
          setEditando(null);
          setMensaje('Turno guardado.');
          void cargar();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {horarioPendiente && (
        <div className="rounded-2xl border border-aviso/50 bg-aviso/10 p-3 text-sm">
          <p className="mb-2">
            Detectamos que editaste DESPACHO o RECIBO a mano. Hay un horario real nuevo (Despacho 39 h con receso
            00:00-01:00, Recibo 44 h sin receso). Queres reemplazar tu horario por el real?
          </p>
          <div className="flex gap-2">
            <button onClick={() => void decidirHorarioReal(true)} className="rounded-xl bg-aviso px-3 py-1.5 font-semibold text-sobre-acento">
              Aplicar horario real
            </button>
            <button onClick={() => void decidirHorarioReal(false)} className="rounded px-3 py-1">
              Conservar el mio
            </button>
          </div>
        </div>
      )}
      {turnos.map((t) => (
        <div key={t.id} className="rounded-2xl border border-borde p-3 text-sm ">
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              {t.nombre} {turnoActivoId === t.id && <span className="text-xs text-exito">(activo hoy)</span>}
            </p>
            <div className="flex gap-3 text-xs">
              <button onClick={() => setEditando(t)} className="text-acento">
                Editar
              </button>
              <button onClick={() => void eliminar(t.id!)} className="text-peligro">
                Eliminar
              </button>
            </div>
          </div>
          <p className="text-xs text-tenue">
            {t.tipoBase} - {(minutosProgramadosSemana(t.horarioPorDia) / 60).toFixed(0)} h programadas/semana (tope {t.horasSemanales} h) - libre {DIAS_SEMANA[t.diaLibre]}
          </p>
          <div className="mt-2">
            <VistaSemanal horario={t.horarioPorDia} />
          </div>
        </div>
      ))}

      <button
        onClick={() => setEditando(turnoEnBlanco())}
        className="w-full rounded-2xl border border-dashed border-borde py-2 text-sm text-tenue "
      >
        + Nuevo turno
      </button>

      <div className="rounded-2xl border border-borde p-3 ">
        <p className="mb-2 text-xs font-semibold uppercase text-tenue">Registrar rotacion de turno</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={fechaRotacion}
            onChange={(e) => setFechaRotacion(e.target.value)}
            className="flex-1 campo"
          />
          <select
            onChange={(e) => e.target.value && void rotar(Number(e.target.value))}
            defaultValue=""
            className="flex-1 campo"
          >
            <option value="" disabled>
              Cambiar a...
            </option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mensaje && <p className="text-xs text-exito">{mensaje}</p>}
    </div>
  );
}
