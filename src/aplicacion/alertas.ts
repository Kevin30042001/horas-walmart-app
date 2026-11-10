import type { DesgloseMinutos } from '../domain/tipos';
import { formatoFechaLocal, parsearFechaLocal } from '../utils/fecha';

export type TipoAlerta = 'sinSalida' | 'extrasSinFoto' | 'asuetoProximo' | 'topeLegal' | 'topeSemanal';

export interface Alerta {
  tipo: TipoAlerta;
  gravedad: 'aviso' | 'info';
  titulo: string;
  detalle: string;
  fecha?: string;
}

export interface EntradaAlertas {
  ahora: Date;
  horasMaxJornadaAbierta: number;
  /** Entradas sin salida (fecha de jornada + hora de entrada). */
  entradasSinSalida: { fecha: string; horaReal: Date }[];
  jornadas: {
    fecha: string;
    desgloseMinutos: DesgloseMinutos;
    esAsueto: boolean;
    esDescansoSemanalLaborado: boolean;
    advertencias?: string[];
    tieneFoto: boolean;
  }[];
  asuetos: { fecha: string; nombre: string }[];
  excesosSemanales: { inicioSemana: string; turnoNombre: string; excesoMin: number; capMin: number }[];
  diasAvisoAsueto?: number;
}

function minutosExtra(d: DesgloseMinutos): number {
  return d.extraDiurna + d.extraNocturna + d.asuetoExtraDiurna + d.asuetoExtraNocturna;
}

/**
 * Alertas del Dashboard:
 *  - jornada con entrada y sin salida (marcacion olvidada),
 *  - dia con extras, asueto o dia libre laborado SIN foto de evidencia,
 *  - asueto proximo (7 dias por defecto),
 *  - exceso sobre el tope legal diario (8 h / 7 h) y semanal (44 h / 39 h).
 */
export function calcularAlertas(e: EntradaAlertas): Alerta[] {
  const alertas: Alerta[] = [];
  const limite = e.ahora.getTime() - e.horasMaxJornadaAbierta * 3600_000;

  for (const s of e.entradasSinSalida) {
    if (s.horaReal.getTime() < limite) {
      alertas.push({
        tipo: 'sinSalida',
        gravedad: 'aviso',
        titulo: 'Marcacion olvidada',
        detalle: 'Tiene entrada pero no salida. Agrega la salida en Registros para que se calcule.',
        fecha: s.fecha,
      });
    }
  }

  for (const j of e.jornadas) {
    const necesitaEvidencia = minutosExtra(j.desgloseMinutos) > 0 || j.esAsueto || j.esDescansoSemanalLaborado;
    if (necesitaEvidencia && !j.tieneFoto) {
      alertas.push({
        tipo: 'extrasSinFoto',
        gravedad: 'aviso',
        titulo: j.esAsueto ? 'Asueto sin foto' : j.esDescansoSemanalLaborado ? 'Dia libre laborado sin foto' : 'Extras sin foto',
        detalle: 'Adjunta una foto del marcado como respaldo.',
        fecha: j.fecha,
      });
    }
    for (const a of j.advertencias ?? []) {
      if (a.includes('tope legal')) {
        alertas.push({ tipo: 'topeLegal', gravedad: 'info', titulo: 'Sobre el tope legal diario', detalle: a, fecha: j.fecha });
      }
    }
  }

  const hoy = formatoFechaLocal(e.ahora);
  const hasta = new Date(parsearFechaLocal(hoy));
  hasta.setDate(hasta.getDate() + (e.diasAvisoAsueto ?? 7));
  const hastaIso = formatoFechaLocal(hasta);
  for (const a of e.asuetos) {
    if (a.fecha >= hoy && a.fecha <= hastaIso) {
      alertas.push({ tipo: 'asuetoProximo', gravedad: 'info', titulo: `Asueto: ${a.nombre}`, detalle: 'Si trabajas ese dia, se paga con recargo.', fecha: a.fecha });
    }
  }

  for (const s of e.excesosSemanales) {
    if (s.excesoMin > 0) {
      alertas.push({
        tipo: 'topeSemanal',
        gravedad: 'info',
        titulo: `Semana sobre ${s.capMin / 60} h (${s.turnoNombre})`,
        detalle: `${(s.excesoMin / 60).toFixed(2)} h ordinarias por encima del tope semanal.`,
        fecha: s.inicioSemana,
      });
    }
  }

  // Varias alertas del mismo tipo por dia se agrupan en una sola (no llenar la pantalla).
  const agrupar = (tipo: TipoAlerta, titulo: (n: number) => string, detalle: string) => {
    const delTipo = alertas.filter((a) => a.tipo === tipo);
    if (delTipo.length <= 1) return;
    const fechas = delTipo.map((a) => a.fecha!).sort();
    const { gravedad } = delTipo[0]!;
    const resto = alertas.filter((a) => a.tipo !== tipo);
    resto.push({
      tipo,
      gravedad,
      titulo: titulo(delTipo.length),
      detalle: `${detalle} ${fechas.map((f) => f.slice(8, 10) + '/' + f.slice(5, 7)).join(', ')}.`,
    });
    alertas.length = 0;
    alertas.push(...resto);
  };
  agrupar('extrasSinFoto', (n) => `${n} dias con extras, asueto o dia libre sin foto`, 'Adjunta evidencia en Registros:');
  agrupar('topeLegal', (n) => `${n} dias sobre el tope legal diario (8 h / 7 h)`, 'Es informativo, no cambia el pago:');

  const orden: Record<Alerta['gravedad'], number> = { aviso: 0, info: 1 };
  return alertas.sort((a, b) => orden[a.gravedad] - orden[b.gravedad] || (a.fecha ?? '').localeCompare(b.fecha ?? ''));
}
