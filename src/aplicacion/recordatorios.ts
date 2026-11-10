import type { HorarioProgramado } from '../domain/tipos';
import { anclarHorario } from '../domain/horario/ventana';
import { formatoFechaLocal } from '../utils/fecha';

export interface ConfigRecordatorios {
  activos: boolean;
  /** Minutos antes de la entrada programada. */
  minAntesEntrada: number;
  /** Minutos despues de la salida programada sin haber marcado. */
  minDespuesSalida: number;
  /** Avisar si quedo una jornada abierta (entrada sin salida). */
  avisoJornadaAbierta: boolean;
}

export const RECORDATORIOS_DEFECTO: ConfigRecordatorios = {
  activos: false,
  minAntesEntrada: 15,
  minDespuesSalida: 20,
  avisoJornadaAbierta: true,
};

export interface Recordatorio {
  id: number;
  en: Date;
  titulo: string;
  cuerpo: string;
}

export interface EntradaPlan {
  ahora: Date;
  dias?: number;
  config: ConfigRecordatorios;
  /** Horario programado de la fecha segun su turno (null = dia libre). */
  horarioDe: (fecha: string) => HorarioProgramado | null;
  fechasConEntrada: Set<string>;
  fechasConSalida: Set<string>;
  jornadaAbierta: { fecha: string; entrada: Date } | null;
  horasMaxJornadaAbierta: number;
  hora: (d: Date) => string;
}

function idDe(fecha: string, tipo: number): number {
  return Number(fecha.replaceAll('-', '')) * 10 + tipo;
}

/**
 * Plan de notificaciones locales de los proximos dias (se reprograma al abrir
 * la app y despues de cada marca):
 *  - X min antes de la entrada programada,
 *  - X min despues de la salida programada si no marcaste salida,
 *  - aviso si quedo una jornada abierta.
 */
export function planificarRecordatorios(e: EntradaPlan): Recordatorio[] {
  if (!e.config.activos) return [];
  const lista: Recordatorio[] = [];
  const dias = e.dias ?? 7;

  for (let i = -1; i < dias; i++) {
    const d = new Date(e.ahora);
    d.setDate(d.getDate() + i);
    const fecha = formatoFechaLocal(d);
    const horario = e.horarioDe(fecha);
    if (!horario) continue;
    const v = anclarHorario(fecha, horario);

    const entradaEn = new Date(v.inicio.getTime() - e.config.minAntesEntrada * 60_000);
    if (entradaEn > e.ahora && !e.fechasConEntrada.has(fecha)) {
      lista.push({
        id: idDe(fecha, 1),
        en: entradaEn,
        titulo: 'Tu turno empieza pronto',
        cuerpo: `Entrada programada a las ${e.hora(v.inicio)}. Toca para marcar.`,
      });
    }
    const salidaEn = new Date(v.fin.getTime() + e.config.minDespuesSalida * 60_000);
    if (salidaEn > e.ahora && !e.fechasConSalida.has(fecha)) {
      lista.push({
        id: idDe(fecha, 2),
        en: salidaEn,
        titulo: 'Ya marcaste tu salida?',
        cuerpo: `Tu salida programada era a las ${e.hora(v.fin)}. Si te quedaste, cuenta como extra.`,
      });
    }
  }

  if (e.config.avisoJornadaAbierta && e.jornadaAbierta) {
    const en = new Date(e.jornadaAbierta.entrada.getTime() + (e.horasMaxJornadaAbierta - 1) * 3600_000);
    if (en > e.ahora) {
      lista.push({
        id: idDe(e.jornadaAbierta.fecha, 3),
        en,
        titulo: 'Jornada sin salida',
        cuerpo: `Tu jornada desde las ${e.hora(e.jornadaAbierta.entrada)} sigue abierta. Marca la salida para que se calcule.`,
      });
    }
  }
  return lista.sort((a, b) => a.en.getTime() - b.en.getTime());
}
