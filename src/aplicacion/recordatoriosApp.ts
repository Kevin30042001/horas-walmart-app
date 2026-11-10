import { db, type PerfilRow } from '../data/db';
import { obtenerPerfil, obtenerTurnoVigente } from '../data/repos/perfilRepo';
import { listarRegistrosRecientes } from '../data/repos/registrosRepo';
import { programarRecordatorios } from '../utils/notificaciones';
import { formatoFechaLocal, formatoHora } from '../utils/fecha';
import { encontrarJornadaAbierta } from './jornadaAbierta';
import { horarioDelDia } from './marcado';
import { planificarRecordatorios, RECORDATORIOS_DEFECTO, type ConfigRecordatorios } from './recordatorios';
import type { HorarioProgramado } from '../domain/tipos';

export function configRecordatorios(perfil: PerfilRow): ConfigRecordatorios {
  return { ...RECORDATORIOS_DEFECTO, ...(perfil.recordatorios ?? {}) };
}

/** Reune horarios y marcas de los proximos dias y reprograma las notificaciones locales. */
export async function reprogramarRecordatorios(ahora = new Date()): Promise<void> {
  const perfil = await obtenerPerfil();
  const config = configRecordatorios(perfil);
  const DIAS = 7;

  const horarios = new Map<string, HorarioProgramado | null>();
  for (let i = -1; i < DIAS; i++) {
    const d = new Date(ahora);
    d.setDate(d.getDate() + i);
    const fecha = formatoFechaLocal(d);
    horarios.set(fecha, horarioDelDia(await obtenerTurnoVigente(fecha), fecha));
  }
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  const registros = await db.registros.where('fecha').aboveOrEqual(formatoFechaLocal(ayer)).toArray();
  const recientes = await listarRegistrosRecientes(ahora);
  const abierta = encontrarJornadaAbierta(recientes, ahora, perfil.horasMaxJornadaAbierta);
  const entradaAbierta = abierta ? recientes.find((r) => r.fecha === abierta && r.tipoEvento === 'entrada') : undefined;

  const lista = planificarRecordatorios({
    ahora,
    dias: DIAS,
    config,
    horarioDe: (fecha) => horarios.get(fecha) ?? null,
    fechasConEntrada: new Set(registros.filter((r) => r.tipoEvento === 'entrada').map((r) => r.fecha)),
    fechasConSalida: new Set(registros.filter((r) => r.tipoEvento === 'salida').map((r) => r.fecha)),
    jornadaAbierta: abierta && entradaAbierta ? { fecha: abierta, entrada: entradaAbierta.horaReal } : null,
    horasMaxJornadaAbierta: perfil.horasMaxJornadaAbierta,
    hora: (d) => formatoHora(d, perfil.formato24h),
  });
  await programarRecordatorios(lista);
}
