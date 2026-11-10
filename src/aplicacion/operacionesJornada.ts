import { db } from '../data/db';
import {
  actualizarRegistro,
  agregarRegistro,
  eliminarRegistro,
  guardarFoto,
  listarRegistrosDelDia,
  obtenerRegistro,
} from '../data/repos/registrosRepo';
import { obtenerPerfil, obtenerTurnoVigente } from '../data/repos/perfilRepo';
import { comprimirAWebp, calcularSha256 } from '../utils/imagen';
import { leerFechaCaptura } from '../utils/exif';
import { formatoFechaLocal } from '../utils/fecha';
import { construirMarcasDiaPasado, resolverFechaJornada, type DiaPasado } from './edicionJornada';
import { procesarJornadaDelDia } from './procesarJornada';
import type { AccionMarcado } from './estadoDelDia';

export class JornadaYaExisteError extends Error {
  constructor(fecha: string) {
    super(`Ya hay marcas para el ${fecha}.`);
  }
}

/** Agrega (o reemplaza, si `reemplazar`) un dia pasado escrito a mano y lo calcula. */
export async function agregarDiaPasado(dia: DiaPasado, nota = '', reemplazar = false): Promise<void> {
  const marcas = construirMarcasDiaPasado(dia);
  const turno = await obtenerTurnoVigente(dia.fecha);
  if (!turno?.id) throw new Error('No hay un turno configurado para esa fecha.');

  const existentes = await listarRegistrosDelDia(dia.fecha);
  if (existentes.length > 0 && !reemplazar) throw new JornadaYaExisteError(dia.fecha);

  await db.transaction('rw', db.registros, db.fotos, async () => {
    for (const r of existentes) {
      if (r.fotoId) await db.fotos.delete(r.fotoId);
      await db.registros.delete(r.id!);
    }
    for (const m of marcas) {
      await db.registros.add({
        fecha: dia.fecha,
        turnoId: turno.id!,
        tipoEvento: m.tipoEvento,
        horaReal: m.horaReal,
        horaPlanificada: null,
        origen: 'manual',
        nota,
        fotoId: null,
        confirmadoPorUsuario: true,
      });
    }
  });
  await procesarJornadaDelDia(dia.fecha);
}

/** Cambia la hora de una marca y recalcula su jornada. */
export async function editarMarca(id: number, horaReal: Date, nota?: string): Promise<void> {
  const registro = await obtenerRegistro(id);
  if (!registro) return;
  await actualizarRegistro(id, { horaReal, ...(nota !== undefined ? { nota } : {}), confirmadoPorUsuario: true });
  await procesarJornadaDelDia(registro.fecha);
}

/** Elimina una marca (y su foto) y recalcula su jornada. */
export async function eliminarMarca(id: number): Promise<void> {
  const registro = await obtenerRegistro(id);
  if (!registro) return;
  await eliminarRegistro(id);
  await procesarJornadaDelDia(registro.fecha);
}

/** Agrega una marca suelta a una jornada existente (ej. un receso que olvidaste). */
export async function agregarMarcaAJornada(fecha: string, accion: AccionMarcado, horaReal: Date): Promise<number> {
  const turno = await obtenerTurnoVigente(fecha);
  if (!turno?.id) throw new Error('No hay un turno configurado para esa fecha.');
  const id = await agregarRegistro({
    fecha,
    turnoId: turno.id,
    tipoEvento: accion,
    horaReal,
    horaPlanificada: null,
    origen: 'manual',
    nota: '',
    fotoId: null,
    confirmadoPorUsuario: true,
  });
  await procesarJornadaDelDia(fecha);
  return id;
}

/** Comprime la foto (WebP ~200 KB), calcula su SHA-256, lee el EXIF y la vincula a la marca. */
export async function adjuntarFotoARegistro(registroId: number, archivo: File, discrepancia = false): Promise<number> {
  const [webp, captura] = await Promise.all([comprimirAWebp(archivo), leerFechaCaptura(archivo)]);
  const hash = await calcularSha256(webp);
  const registro = await obtenerRegistro(registroId);
  // si ya tenia foto, la nueva la reemplaza
  if (registro?.fotoId) await db.fotos.delete(registro.fotoId);
  const fotoId = await guardarFoto({
    registroId,
    blobWebp: webp,
    hashSha256: hash,
    exifFecha: captura.fecha,
    discrepancia,
    tamanoBytes: webp.size,
    creadoEn: new Date(),
  });
  await actualizarRegistro(registroId, { fotoId });
  return fotoId;
}

/**
 * Marca con foto (OCR confirmado por el usuario): la marca se asigna a la
 * jornada de la FECHA LEIDA (una salida de madrugada va a la jornada del dia
 * anterior), nunca a "hoy". Si esa jornada ya tenia esa marca, se reemplaza la hora.
 */
export async function marcarConFoto(params: {
  accion: AccionMarcado;
  fechaHora: Date;
  archivo: File;
  discrepancia: boolean;
}): Promise<{ fechaJornada: string }> {
  const perfil = await obtenerPerfil();
  const desde = new Date(params.fechaHora.getTime() - 2 * 86_400_000);
  const entradas = await db.registros
    .where('fecha')
    .between(formatoFechaLocal(desde), formatoFechaLocal(params.fechaHora), true, true)
    .filter((r) => r.tipoEvento === 'entrada')
    .toArray();

  const fechaJornada = resolverFechaJornada({
    fechaHora: params.fechaHora,
    accion: params.accion,
    entradas,
    horasMax: perfil.horasMaxJornadaAbierta,
  });
  const turno = await obtenerTurnoVigente(fechaJornada);
  if (!turno?.id) throw new Error('No hay un turno configurado para esa fecha.');

  const existente = (await listarRegistrosDelDia(fechaJornada)).find((r) => r.tipoEvento === params.accion);
  let registroId: number;
  if (existente?.id) {
    registroId = existente.id;
    await actualizarRegistro(registroId, { horaReal: params.fechaHora, origen: 'foto_ocr', confirmadoPorUsuario: true });
  } else {
    registroId = await agregarRegistro({
      fecha: fechaJornada,
      turnoId: turno.id,
      tipoEvento: params.accion,
      horaReal: params.fechaHora,
      horaPlanificada: null,
      origen: 'foto_ocr',
      nota: '',
      fotoId: null,
      confirmadoPorUsuario: true,
    });
  }
  await adjuntarFotoARegistro(registroId, params.archivo, params.discrepancia);
  await procesarJornadaDelDia(fechaJornada);
  return { fechaJornada };
}

/** Borra una jornada completa: sus marcas, fotos y el calculo. */
export async function eliminarJornadaCompleta(fecha: string): Promise<void> {
  const registros = await listarRegistrosDelDia(fecha);
  await db.transaction('rw', db.registros, db.fotos, db.jornadas, async () => {
    for (const r of registros) {
      if (r.fotoId) await db.fotos.delete(r.fotoId);
      await db.registros.delete(r.id!);
    }
    await db.jornadas.where('fecha').equals(fecha).delete();
  });
}
