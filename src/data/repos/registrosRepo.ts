import { db, type JornadaRow, type RegistroRow, type FotoRow } from '../db';

export async function agregarRegistro(registro: RegistroRow): Promise<number> {
  return (await db.registros.add(registro)) as number;
}

export async function listarRegistrosDelDia(fecha: string): Promise<RegistroRow[]> {
  return db.registros.where('fecha').equals(fecha).sortBy('horaReal');
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
