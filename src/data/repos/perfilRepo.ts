import { db, type PerfilRow, type TurnoRow, type RotacionRow } from '../db';
import type { ParametrosTurno } from '../../domain/tipos';
import { fechaLocalHoy } from '../../utils/fecha';
import { HORARIO_REAL_POR_NOMBRE } from '../migraciones';

export async function obtenerPerfil(): Promise<PerfilRow> {
  const perfil = await db.perfil.get(1);
  if (!perfil) throw new Error('Perfil no inicializado -- corre sembrarDatosPorDefecto() primero');
  return perfil;
}

export async function guardarPerfil(cambios: Partial<Omit<PerfilRow, 'id'>>): Promise<void> {
  await db.perfil.update(1, cambios);
}

export async function listarTurnos(): Promise<TurnoRow[]> {
  return db.turnos.toArray();
}

export async function obtenerTurnoPorNombre(nombre: string): Promise<TurnoRow | undefined> {
  return db.turnos.where('nombre').equals(nombre).first();
}

export async function guardarTurno(turno: TurnoRow): Promise<number> {
  if (turno.id) {
    await db.turnos.put(turno);
    return turno.id;
  }
  return (await db.turnos.add(turno)) as number;
}

/** No deja borrar un turno si es el unico que queda, ni si alguna jornada ya lo uso. */
export async function eliminarTurno(id: number): Promise<{ ok: boolean; motivo?: string }> {
  const totalTurnos = await db.turnos.count();
  if (totalTurnos <= 1) return { ok: false, motivo: 'No podes borrar el unico turno que tenes configurado.' };

  const jornadasConEsteTurno = await db.jornadas.where('turnoId').equals(id).count();
  if (jornadasConEsteTurno > 0) {
    return { ok: false, motivo: `Hay ${jornadasConEsteTurno} jornada(s) calculadas con este turno -- no se puede borrar.` };
  }

  await db.turnos.delete(id);
  await db.rotaciones.where('turnoId').equals(id).delete();
  return { ok: true };
}

/**
 * Devuelve el turno vigente para una fecha dada (yyyy-MM-dd), segun la ULTIMA
 * rotacion registrada en o antes de esa fecha -- esta es la UNICA fuente de
 * verdad de "que turno aplica cuando" (antes habia una logica separada por
 * `turno.vigenteDesde/vigenteHasta` que nunca se enteraba de las rotaciones
 * reales del usuario; se elimino esa duplicacion).
 * Si todavia no hay ninguna rotacion registrada, cae al primer turno que exista.
 */
export async function obtenerTurnoVigente(fecha: string): Promise<TurnoRow | undefined> {
  const rotaciones = await listarRotaciones();
  const vigente = [...rotaciones].reverse().find((r) => r.fecha <= fecha);
  if (vigente) return db.turnos.get(vigente.turnoId);
  return (await listarTurnos())[0];
}

export function turnoRowAParametros(turno: TurnoRow): ParametrosTurno {
  return { nombre: turno.nombre, horasSemanales: turno.horasSemanales, diaInicioSemana: turno.diaInicioSemana };
}

export async function registrarRotacion(rotacion: RotacionRow): Promise<number> {
  return (await db.rotaciones.add(rotacion)) as number;
}

export async function listarRotaciones(): Promise<RotacionRow[]> {
  return db.rotaciones.orderBy('fecha').toArray();
}

/** Turno activo "hoy" -- atajo sobre `obtenerTurnoVigente` evaluado en la fecha local actual. */
export async function obtenerTurnoActivo(): Promise<TurnoRow | undefined> {
  return obtenerTurnoVigente(fechaLocalHoy());
}

/**
 * Cambio de turno "con un toque": registra la rotacion con fecha de hoy. Si ya
 * habia una rotacion hoy, la reemplaza (evita duplicados si tocas dos veces).
 */
export async function cambiarTurnoDesdeHoy(turnoId: number, fecha = fechaLocalHoy()): Promise<void> {
  await db.transaction('rw', db.rotaciones, async () => {
    await db.rotaciones.where('fecha').equals(fecha).delete();
    await db.rotaciones.add({ fecha, turnoId, nota: 'Cambio rapido desde Marcar' });
  });
}

/** Reemplaza el horario de DESPACHO/RECIBO por el horario real (tras confirmar el usuario). */
export async function aplicarHorarioReal(): Promise<void> {
  await db.transaction('rw', db.turnos, db.perfil, async () => {
    for (const turno of await db.turnos.toArray()) {
      const real = HORARIO_REAL_POR_NOMBRE[turno.nombre.trim().toUpperCase()];
      if (real) await db.turnos.update(turno.id!, { horarioPorDia: real.map((h) => ({ ...h })) });
    }
    await db.perfil.update(1, { horarioRealPendiente: false });
  });
}

export async function descartarHorarioRealPendiente(): Promise<void> {
  await db.perfil.update(1, { horarioRealPendiente: false });
}
