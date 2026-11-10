import type { HorarioDia, RegistroRow, TurnoRow } from '../data/db';
import type { VentanaProgramada } from '../domain/tipos';
import { anclarHorario } from '../domain/horario/ventana';
import { obtenerPerfil, obtenerTurnoVigente } from '../data/repos/perfilRepo';
import { agregarRegistro, listarRegistrosDelDia, listarRegistrosRecientes } from '../data/repos/registrosRepo';
import { encontrarJornadaAbierta } from './jornadaAbierta';
import { siguienteAccion, type AccionMarcado, type EstadoAcciones } from './estadoDelDia';
import { procesarJornadaDelDia } from './procesarJornada';
import { formatoFechaLocal, parsearFechaLocal } from '../utils/fecha';

export function horarioDelDia(turno: TurnoRow | undefined | null, fecha: string): HorarioDia | null {
  if (!turno) return null;
  const dia = parsearFechaLocal(fecha).getDay();
  return turno.horarioPorDia.find((h) => h.diaSemana === dia) ?? null;
}

export interface EstadoMarcado {
  /** Fecha de la jornada (fecha de ENTRADA): la abierta, o hoy si no hay ninguna abierta. */
  fechaJornada: string;
  jornadaAbierta: boolean;
  registros: RegistroRow[];
  turno: TurnoRow | null;
  horario: HorarioDia | null;
  ventana: VentanaProgramada | null;
  acciones: EstadoAcciones;
}

/** Todo lo que necesita la pantalla Marcar, calculado sobre la jornada abierta (no el dia calendario). */
export async function obtenerEstadoMarcado(ahora = new Date()): Promise<EstadoMarcado> {
  const perfil = await obtenerPerfil();
  const recientes = await listarRegistrosRecientes(ahora);
  const abierta = encontrarJornadaAbierta(recientes, ahora, perfil.horasMaxJornadaAbierta);
  const fechaJornada = abierta ?? formatoFechaLocal(ahora);

  const registros = await listarRegistrosDelDia(fechaJornada);
  const turno = (await obtenerTurnoVigente(fechaJornada)) ?? null;
  const horario = horarioDelDia(turno, fechaJornada);
  const ventana = horario ? anclarHorario(fechaJornada, horario) : null;
  const acciones = siguienteAccion(registros, {
    tieneReceso: Boolean(horario?.receso),
    recesoProgramado: ventana?.receso ?? null,
    ahora,
  });

  return { fechaJornada, jornadaAbierta: abierta !== null, registros, turno, horario, ventana, acciones };
}

export interface DatosMarca {
  accion: AccionMarcado;
  horaReal: Date;
  fechaJornada: string;
  turnoId: number;
  origen?: RegistroRow['origen'];
  nota?: string;
  horaPlanificada?: Date | null;
}

/** Guarda una marca y, si cierra la jornada, la recalcula. Devuelve el id del registro. */
export async function registrarMarca(datos: DatosMarca): Promise<number> {
  const id = await agregarRegistro({
    fecha: datos.fechaJornada,
    turnoId: datos.turnoId,
    tipoEvento: datos.accion,
    horaReal: datos.horaReal,
    horaPlanificada: datos.horaPlanificada ?? null,
    origen: datos.origen ?? 'manual',
    nota: datos.nota ?? '',
    fotoId: null,
    confirmadoPorUsuario: true,
  });
  await procesarJornadaDelDia(datos.fechaJornada);
  return id;
}
