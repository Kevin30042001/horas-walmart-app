import { db } from './db';
import { VERSION_CALCULO } from '../domain/calculo/motor';
import { REGLAS_PAGO_DEFECTO } from '../domain/calculo/reglasPagoDefecto';
import { calcularSemanaSanta } from '../domain/tiempo/semanaSanta';
import { HORARIO_DESPACHO, HORARIO_RECIBO } from '../domain/horario/horarioReal';

/** Catalogo base de asuetos nacionales (Art. 190 C.T.) + fiestas patronales de San Salvador. */
function asuetosFijos(anio: number) {
  return [
    { fecha: `${anio}-01-01`, nombre: 'Año Nuevo', ambito: 'nacional' as const },
    { fecha: `${anio}-05-01`, nombre: 'Día del Trabajo', ambito: 'nacional' as const },
    { fecha: `${anio}-08-03`, nombre: 'Fiestas Agostinas (San Salvador)', ambito: 'local' as const },
    { fecha: `${anio}-08-04`, nombre: 'Fiestas Agostinas (San Salvador)', ambito: 'local' as const },
    { fecha: `${anio}-08-05`, nombre: 'Fiestas Agostinas (San Salvador)', ambito: 'local' as const },
    { fecha: `${anio}-08-06`, nombre: 'Fiestas Agostinas (San Salvador)', ambito: 'local' as const },
    { fecha: `${anio}-09-15`, nombre: 'Día de la Independencia', ambito: 'nacional' as const },
    { fecha: `${anio}-11-02`, nombre: 'Día de los Difuntos', ambito: 'nacional' as const },
    { fecha: `${anio}-12-25`, nombre: 'Navidad', ambito: 'nacional' as const },
  ];
}

function fmtFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function asuetosDelAnio(anio: number) {
  const { juevesSanto, viernesSanto, sabadoSanto } = calcularSemanaSanta(anio);
  return [
    ...asuetosFijos(anio),
    { fecha: fmtFecha(juevesSanto), nombre: 'Jueves Santo', ambito: 'nacional' as const },
    { fecha: fmtFecha(viernesSanto), nombre: 'Viernes Santo', ambito: 'nacional' as const },
    { fecha: fmtFecha(sabadoSanto), nombre: 'Sábado Santo', ambito: 'nacional' as const },
  ];
}

/**
 * Puebla la base de datos con valores por defecto SOLO la primera vez que se
 * abre la app (si ya hay un perfil guardado, no toca nada -- idempotente).
 */
export async function sembrarDatosPorDefecto(): Promise<void> {
  const yaExistePerfil = await db.perfil.get(1);
  if (yaExistePerfil) return;

  const hoy = new Date();
  const anioActual = hoy.getFullYear();

  await db.transaction(
    'rw',
    [db.perfil, db.turnos, db.rotaciones, db.reglasPago, db.asuetos, db.deducciones, db.configRetencion],
    async () => {
      await db.perfil.put({
        id: 1,
        nombre: '',
        gafete: '',
        salarioMensual: 0,
        diasMes: 30,
        horasDia: 8,
        formato24h: true,
        tema: 'oscuro',
        pinHash: null,
        biometriaActiva: false,
        division: 'LOG',
        departamento: '',
        tareaPorDefecto: 'Procesos QA',
        horarioRealPendiente: false,
        horasMaxJornadaAbierta: 16,
        toleranciaMin: 6,
        recesoPagadoEnAsueto: true,
        modoSalarioCorte: 'mitad',
        versionCalculo: VERSION_CALCULO,
      });

      const idDespacho = await db.turnos.add({
        nombre: 'DESPACHO',
        tipoBase: 'NOCTURNO',
        horarioPorDia: HORARIO_DESPACHO.map((h) => ({ ...h })),
        horasSemanales: 39,
        diaInicioSemana: 0, // domingo
        diaLibre: 6, // sabado
        vigenteDesde: '2020-01-01',
        vigenteHasta: null,
      });

      await db.turnos.add({
        nombre: 'RECIBO',
        tipoBase: 'DIURNO',
        horarioPorDia: HORARIO_RECIBO.map((h) => ({ ...h })),
        horasSemanales: 44,
        diaInicioSemana: 6, // sabado
        diaLibre: 0, // domingo
        vigenteDesde: '2020-01-01',
        vigenteHasta: null,
      });

      // Rotacion inicial: sin esto, `obtenerTurnoVigente` no sabria que turno
      // aplica antes de que el usuario registre su primera rotacion a mano.
      await db.rotaciones.add({
        fecha: '2020-01-01',
        turnoId: idDespacho as number,
        nota: 'Turno inicial (ajustalo en Configuracion si arrancas en Recibo)',
      });

      await db.reglasPago.bulkAdd(
        REGLAS_PAGO_DEFECTO.map((r) => ({ ...r, vigenteDesde: '2020-01-01' }))
      );

      await db.asuetos.bulkAdd(
        [...asuetosDelAnio(anioActual), ...asuetosDelAnio(anioActual + 1)].map((a) => ({
          ...a,
          esAutomatico: true,
        }))
      );

      // IMPORTANTE: tasas ISSS/AFP vigentes a confirmar; la tabla de ISR es un
      // EJEMPLO de estructura (tramos progresivos), NO la tabla oficial vigente
      // -- el usuario debe verificarla en mh.gob.sv y ajustarla en Configuracion
      // antes de confiar en la proyeccion de Impuesto de Renta.
      await db.deducciones.bulkAdd([
        { nombre: 'ISSS', tipo: 'porcentaje', valorPorcentaje: 3, tramosIsr: null, tope: 1000, activo: true },
        { nombre: 'AFP', tipo: 'porcentaje', valorPorcentaje: 7.25, tramosIsr: null, tope: null, activo: true },
        {
          nombre: 'Impuesto de Renta (EJEMPLO - verificar tabla vigente)',
          tipo: 'tabla',
          valorPorcentaje: null,
          tramosIsr: [
            { desde: 0, hasta: 261.9, cuotaFija: 0, porcentajeExceso: 0 },
            { desde: 261.91, hasta: 915.81, cuotaFija: 0, porcentajeExceso: 10 },
            { desde: 915.82, hasta: 2038.09, cuotaFija: 65.39, porcentajeExceso: 20 },
            { desde: 2038.1, hasta: null, cuotaFija: 289.85, porcentajeExceso: 30 },
          ],
          tope: null,
          activo: true,
        },
      ]);

      await db.configRetencion.put({
        id: 1,
        diasRetencion: 60,
        idsCorteProtegidos: [],
        idsJornadaProtegidas: [],
      });
    }
  );
}
