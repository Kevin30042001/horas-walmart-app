import { db, type PerfilRow, type TurnoRow, type RotacionRow } from '../db';
import type { ParametrosTurno } from '../../domain/tipos';

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

/**
 * Devuelve el turno vigente para una fecha dada (yyyy-MM-dd), revisando la
 * vigencia de cada fila. Si varios turnos tienen vigencia solapada (no deberia
 * pasar, pero por si acaso) se toma el de `vigenteDesde` mas reciente.
 */
export async function obtenerTurnoVigente(fecha: string): Promise<TurnoRow | undefined> {
  const turnos = await db.turnos.toArray();
  return turnos
    .filter((t) => t.vigenteDesde <= fecha && (t.vigenteHasta === null || t.vigenteHasta >= fecha))
    .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0];
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

/** Turno activo "hoy" segun la ultima rotacion registrada (o el primero que exista, como fallback). */
export async function obtenerTurnoActivo(): Promise<TurnoRow | undefined> {
  const rotaciones = await listarRotaciones();
  const ultima = rotaciones.at(-1);
  if (ultima) return db.turnos.get(ultima.turnoId);
  return (await listarTurnos())[0];
}
