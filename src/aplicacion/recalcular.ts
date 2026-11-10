import { listarTodasLasFechasConRegistros } from '../data/repos/registrosRepo';
import { guardarPerfil, obtenerPerfil } from '../data/repos/perfilRepo';
import { VERSION_CALCULO } from '../domain/calculo/motor';
import { procesarJornadaDelDia } from './procesarJornada';

/** Recalcula TODAS las jornadas a partir de sus registros (tras cambiar horario, reglas o version del motor). */
export async function recalcularTodasLasJornadas(): Promise<number> {
  const fechas = await listarTodasLasFechasConRegistros();
  let procesadas = 0;
  for (const fecha of fechas) {
    try {
      if (await procesarJornadaDelDia(fecha)) procesadas++;
    } catch (e) {
      console.warn(`No se pudo recalcular la jornada ${fecha}`, e);
    }
  }
  return procesadas;
}

/** Al abrir la app: si las jornadas se calcularon con un motor viejo, se recalculan una sola vez. */
export async function recalcularSiCambioElMotor(): Promise<void> {
  const perfil = await obtenerPerfil();
  if ((perfil.versionCalculo ?? 0) >= VERSION_CALCULO) return;
  await recalcularTodasLasJornadas();
  await guardarPerfil({ versionCalculo: VERSION_CALCULO });
}
