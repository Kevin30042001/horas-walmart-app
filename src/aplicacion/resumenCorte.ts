import type { DesgloseMinutos, DetalleCalculo, DetalleDeduccion } from '../domain/tipos';
import { TODOS_LOS_TIPOS_HORA } from '../domain/tipos';
import { calcularHoraBase, calcularMontos, sumarMontos } from '../domain/calculo/montos';
import { calcularDeducciones } from '../domain/calculo/deducciones';
import { listarJornadasDeCorte } from '../data/repos/registrosRepo';
import { reglasPagoComoDominio, listarDeducciones } from '../data/repos/configRepo';
import { obtenerPerfil } from '../data/repos/perfilRepo';
import type { JornadaRow } from '../data/db';

export interface ResumenCorte {
  desgloseTotal: DesgloseMinutos;
  detalleMontos: DetalleCalculo[];
  ingresoBruto: number;
  detalleDeducciones: DetalleDeduccion[];
  totalDeducciones: number;
  netoEstimado: number;
  jornadas: JornadaRow[];
}

function sumarDesgloses(jornadas: JornadaRow[]): DesgloseMinutos {
  const total = {} as DesgloseMinutos;
  for (const tipo of TODOS_LOS_TIPOS_HORA) total[tipo] = 0;
  for (const jornada of jornadas) {
    for (const tipo of TODOS_LOS_TIPOS_HORA) total[tipo] += jornada.desgloseMinutos[tipo] ?? 0;
  }
  return total;
}

/**
 * Arma el resumen financiero completo de un corte: suma el desglose de
 * minutos de todas sus jornadas, calcula montos con las reglas de pago
 * vigentes y aplica las deducciones estimadas. Es el dato que alimenta tanto
 * el Dashboard como los exportadores de Reportes -- un solo lugar, sin
 * duplicar la logica de agregacion (DRY).
 */
export async function calcularResumenCorte(corteId: number): Promise<ResumenCorte> {
  const [jornadas, perfil, reglasPago, deducciones] = await Promise.all([
    listarJornadasDeCorte(corteId),
    obtenerPerfil(),
    reglasPagoComoDominio(),
    listarDeducciones(),
  ]);

  const desgloseTotal = sumarDesgloses(jornadas);
  const horaBase =
    perfil.salarioMensual > 0 ? calcularHoraBase(perfil.salarioMensual, perfil.diasMes, perfil.horasDia) : 0;
  const detalleMontos = calcularMontos(desgloseTotal, horaBase, reglasPago);
  const ingresoBruto = sumarMontos(detalleMontos);
  const { detalle: detalleDeducciones, totalDeducciones } = calcularDeducciones(ingresoBruto, deducciones);

  return {
    desgloseTotal,
    detalleMontos,
    ingresoBruto,
    detalleDeducciones,
    totalDeducciones,
    netoEstimado: Math.round((ingresoBruto - totalDeducciones) * 100) / 100,
    jornadas,
  };
}
