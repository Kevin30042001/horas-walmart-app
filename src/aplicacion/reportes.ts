import { construirFo3106, type Fo3106 } from '../domain/reportes/fo3106';
import { listarTurnos, obtenerPerfil } from '../data/repos/perfilRepo';
import type { DatosExportacionCorte } from '../utils/export/excel';
import type { ResumenCorte } from './resumenCorte';

/** FO-3106 de un corte, con los datos del perfil (division, departamento, gafete, nombre, tarea). */
export async function construirFo3106DeCorte(resumen: ResumenCorte): Promise<Fo3106 | null> {
  if (!resumen.corte) return null;
  const perfil = await obtenerPerfil();
  return construirFo3106({
    jornadas: resumen.jornadas,
    perfil: {
      gafete: perfil.gafete,
      nombre: perfil.nombre || 'Sin nombre configurado',
      division: perfil.division,
      departamento: perfil.departamento,
    },
    tarea: perfil.tareaPorDefecto,
    periodo: { inicio: resumen.corte.fechaInicio, fin: resumen.corte.fechaCorte },
  });
}

/** Datos de exportacion de un corte (Excel, PDF, FO-3106 y respaldo ZIP). */
export async function construirDatosExportacion(resumen: ResumenCorte): Promise<DatosExportacionCorte | null> {
  const corte = resumen.corte;
  if (!corte) return null;
  const [turnos, perfil] = await Promise.all([listarTurnos(), obtenerPerfil()]);
  return {
    resumen,
    nombreTurnoPorId: Object.fromEntries(turnos.filter((t) => t.id).map((t) => [t.id as number, t.nombre])),
    nombreColaborador: perfil.nombre || 'Sin nombre configurado',
    gafete: perfil.gafete,
    etiquetaCorte: `${corte.fechaInicio}_al_${corte.fechaCorte}`,
    fo3106: await construirFo3106DeCorte(resumen),
  };
}
