import { construirFo3106, type Fo3106 } from '../domain/reportes/fo3106';
import { obtenerPerfil } from '../data/repos/perfilRepo';
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
