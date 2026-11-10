import { db, type JornadaRow, type RegistroRow, type FotoRow } from '../db';

export async function agregarRegistro(registro: RegistroRow): Promise<number> {
  return (await db.registros.add(registro)) as number;
}

export async function listarRegistrosDelDia(fecha: string): Promise<RegistroRow[]> {
  return db.registros.where('fecha').equals(fecha).sortBy('horaReal');
}

/** Registros de las jornadas de ayer y hoy (o los ultimos `dias`), para detectar la jornada abierta. */
export async function listarRegistrosRecientes(ahora: Date, dias = 2): Promise<RegistroRow[]> {
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - dias);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return db.registros.where('fecha').between(fmt(desde), fmt(ahora), true, true).sortBy('horaReal');
}

export async function obtenerRegistro(id: number): Promise<RegistroRow | undefined> {
  return db.registros.get(id);
}

export async function eliminarRegistro(id: number): Promise<void> {
  await db.transaction('rw', db.registros, db.fotos, async () => {
    const registro = await db.registros.get(id);
    if (registro?.fotoId) await db.fotos.delete(registro.fotoId);
    await db.registros.delete(id);
  });
}

export async function eliminarJornadaPorFecha(fecha: string): Promise<void> {
  await db.jornadas.where('fecha').equals(fecha).delete();
}

export async function listarTodasLasFechasConRegistros(): Promise<string[]> {
  return (await db.registros.orderBy('fecha').uniqueKeys()) as string[];
}

/** El ultimo registro de tipo entrada/salida/receso, para saber "que toca marcar ahora". */
export async function obtenerUltimoRegistro(): Promise<RegistroRow | undefined> {
  return db.registros.orderBy('id').last();
}

export async function actualizarRegistro(id: number, cambios: Partial<RegistroRow>): Promise<void> {
  await db.registros.update(id, cambios);
}

export async function guardarFoto(foto: FotoRow): Promise<number> {
  return (await db.fotos.add(foto)) as number;
}

export async function obtenerFoto(id: number): Promise<FotoRow | undefined> {
  return db.fotos.get(id);
}

export async function guardarJornada(jornada: JornadaRow): Promise<number> {
  if (jornada.id) {
    await db.jornadas.put(jornada);
    return jornada.id;
  }
  return (await db.jornadas.add(jornada)) as number;
}

export async function obtenerJornadaPorFecha(fecha: string): Promise<JornadaRow | undefined> {
  return db.jornadas.where('fecha').equals(fecha).first();
}

export async function listarJornadasEntre(fechaInicio: string, fechaFin: string): Promise<JornadaRow[]> {
  return db.jornadas.where('fecha').between(fechaInicio, fechaFin, true, true).sortBy('fecha');
}

export async function listarJornadasDeCorte(corteId: number): Promise<JornadaRow[]> {
  return db.jornadas.where('corteId').equals(corteId).sortBy('fecha');
}

export async function marcarJornadaProtegida(id: number, protegida: boolean): Promise<void> {
  await db.jornadas.update(id, { protegida });
}

export async function eliminarJornadasYFotos(ids: number[]): Promise<void> {
  const jornadas = await db.jornadas.bulkGet(ids);
  const registrosIds = jornadas.flatMap((j) => j?.registrosIds ?? []);
  const registros = await db.registros.bulkGet(registrosIds);
  const fotoIds = registros.map((r) => r?.fotoId).filter((id): id is number => id !== null && id !== undefined);

  await db.transaction('rw', [db.jornadas, db.registros, db.fotos], async () => {
    await db.fotos.bulkDelete(fotoIds);
    await db.registros.bulkDelete(registrosIds);
    await db.jornadas.bulkDelete(ids);
  });
}
