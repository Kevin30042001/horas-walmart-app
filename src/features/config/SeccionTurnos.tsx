import { useEffect, useState } from 'react';
import {
  listarTurnos,
  guardarTurno,
  eliminarTurno,
  obtenerTurnoActivo,
  registrarRotacion,
} from '../../data/repos/perfilRepo';
import { fechaLocalHoy } from '../../utils/fecha';
import type { HorarioDia, TurnoRow } from '../../data/db';

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
      horarioPorDia: [...resto, { diaSemana, horaEntrada: '08:00', horaSalida: '17:00', recesoMin: 30 }].sort(
        (a, b) => a.diaSemana - b.diaSemana
      ),
    });
  }

  function cambiarHorario(diaSemana: number, campo: keyof HorarioDia, valor: string | number): void {
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
    onGuardado();
  }

  return (
    <div className="space-y-3">
      <button onClick={onCancelar} className="text-sm font-medium text-marca">
        Volver
      </button>

      <input
        value={editando.nombre}
        onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
        placeholder="Nombre del turno (ej. DESPACHO)"
        className="w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={editando.tipoBase}
          onChange={(e) => setEditando({ ...editando, tipoBase: e.target.value as 'DIURNO' | 'NOCTURNO' })}
          className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="DIURNO">Diurno</option>
          <option value="NOCTURNO">Nocturno</option>
        </select>
        <input
          type="number"
          value={editando.horasSemanales}
          onChange={(e) => setEditando({ ...editando, horasSemanales: Number(e.target.value) || 0 })}
          placeholder="Horas semanales"
          className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500">Inicio de semana (tope legal)</label>
          <select
            value={editando.diaInicioSemana}
            onChange={(e) => setEditando({ ...editando, diaInicioSemana: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {DIAS_SEMANA.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Dia libre</label>
          <select
            value={editando.diaLibre}
            onChange={(e) => setEditando({ ...editando, diaLibre: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {DIAS_SEMANA.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase text-slate-400">Horario por dia</p>
      <p className="text-xs text-slate-400">
        Si la salida es antes que la entrada (ej. 20:00 a 04:00) se asume que cruza la medianoche.
      </p>
      <div className="space-y-1">
        {DIAS_SEMANA.map((nombreDia, diaSemana) => {
          const horario = horarioDeDia(editando, diaSemana);
          return (
            <div
              key={diaSemana}
              className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-2 text-xs dark:border-slate-700"
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
                    className="rounded border border-slate-300 p-1 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span>a</span>
                  <input
                    type="time"
                    value={horario.horaSalida}
                    onChange={(e) => cambiarHorario(diaSemana, 'horaSalida', e.target.value)}
                    className="rounded border border-slate-300 p-1 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <input
                    type="number"
                    value={horario.recesoMin}
                    onChange={(e) => cambiarHorario(diaSemana, 'recesoMin', Number(e.target.value) || 0)}
                    className="w-16 rounded border border-slate-300 p-1 dark:border-slate-700 dark:bg-slate-800"
                    title="Receso en minutos"
                  />
                  <span>min receso</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {mensaje && <p className="text-xs text-red-500">{mensaje}</p>}
      <button onClick={() => void guardar()} className="w-full rounded-lg bg-marca py-2 font-semibold text-white">
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

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    setTurnos(await listarTurnos());
    const activo = await obtenerTurnoActivo();
    setTurnoActivoId(activo?.id ?? null);
  }

  async function eliminar(id: number): Promise<void> {
    const resultado = await eliminarTurno(id);
    setMensaje(resultado.ok ? 'Turno eliminado.' : (resultado.motivo ?? 'No se pudo eliminar.'));
    await cargar();
  }

  async function rotar(turnoId: number): Promise<void> {
    await registrarRotacion({ fecha: fechaRotacion, turnoId, nota: '' });
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
      {turnos.map((t) => (
        <div key={t.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              {t.nombre} {turnoActivoId === t.id && <span className="text-xs text-emerald-600">(activo hoy)</span>}
            </p>
            <div className="flex gap-3 text-xs">
              <button onClick={() => setEditando(t)} className="text-marca">
                Editar
              </button>
              <button onClick={() => void eliminar(t.id!)} className="text-red-500">
                Eliminar
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {t.tipoBase} - {t.horasSemanales}h/semana - libre {DIAS_SEMANA[t.diaLibre]}
          </p>
        </div>
      ))}

      <button
        onClick={() => setEditando(turnoEnBlanco())}
        className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 dark:border-slate-700"
      >
        + Nuevo turno
      </button>

      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Registrar rotacion de turno</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={fechaRotacion}
            onChange={(e) => setFechaRotacion(e.target.value)}
            className="flex-1 rounded border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <select
            onChange={(e) => e.target.value && void rotar(Number(e.target.value))}
            defaultValue=""
            className="flex-1 rounded border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
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

      {mensaje && <p className="text-xs text-emerald-600">{mensaje}</p>}
    </div>
  );
}
