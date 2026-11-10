import Dexie, { type EntityTable } from 'dexie';
import type { DesgloseMinutos, HorarioProgramado, HorasPorTipo, ReglaDeduccion, ReglaPago, TramoJornada } from '../domain/tipos';
import { REGLAS_PAGO_DEFECTO } from '../domain/calculo/reglasPagoDefecto';
import { migrarHorarioV1, type HorarioDiaV1 } from './migraciones';

/**
 * Esquema de IndexedDB (via Dexie). Todo lo que ve el usuario en Configuracion
 * vive aqui como filas editables -- nada de reglas de negocio quemadas.
 */

export interface PerfilRow {
  id: number; // singleton, siempre 1
  nombre: string;
  gafete: string;
  salarioMensual: number;
  diasMes: number;
  horasDia: number;
  formato24h: boolean;
  tema: 'claro' | 'oscuro' | 'auto';
  pinHash: string | null;
  biometriaActiva: boolean;
  /** v2: datos del formato FO-3106. */
  division: string;
  departamento: string;
  tareaPorDefecto: string;
  /**
   * v2: true si la migracion encontro DESPACHO/RECIBO editados a mano y NO
   * los reemplazo por el horario real: la app pregunta antes de aplicarlo.
   */
  horarioRealPendiente: boolean;
  /** v3: horas que una entrada sin salida sigue "abierta" (turno nocturno). */
  horasMaxJornadaAbierta: number;
  /** v3: minutos de llegada temprana / salida tarde que se ignoran (no cuentan como extra). */
  toleranciaMin: number;
  /** v3: salario del corte = mensual / 2, o proporcional a los dias del corte. */
  modoSalarioCorte: 'mitad' | 'proporcional';
  /** Regla de cortes (dias de corte y de pago); si falta, la de Walmart (4->14, 19->28). */
  reglaCortes?: { diaCorte: number; diaPago: number }[];
  /** Recordatorios locales (opcional; si falta se usan los valores por defecto). */
  recordatorios?: {
    activos: boolean;
    minAntesEntrada: number;
    minDespuesSalida: number;
    avisoJornadaAbierta: boolean;
  };
  /** v3: version del motor con que se calcularon las jornadas guardadas (si es vieja se recalcula todo). */
  versionCalculo: number;
}

/**
 * Horario de un dia de la semana. `horaSalida` <= `horaEntrada` => la salida
 * cae al dia siguiente. El receso es una ventana opcional con inicio y fin.
 */
export interface HorarioDia extends HorarioProgramado {
  diaSemana: number; // 0=domingo .. 6=sabado
}

export interface TurnoRow {
  id?: number;
  nombre: string;
  tipoBase: 'DIURNO' | 'NOCTURNO';
  horarioPorDia: HorarioDia[];
  horasSemanales: number;
  diaInicioSemana: number;
  diaLibre: number;
  vigenteDesde: string; // yyyy-MM-dd
  vigenteHasta: string | null;
}

export interface RotacionRow {
  id?: number;
  fecha: string;
  turnoId: number;
  nota: string;
}

export interface RegistroRow {
  id?: number;
  fecha: string; // dia de la jornada (dia de ENTRADA)
  turnoId: number;
  tipoEvento: 'entrada' | 'salida' | 'inicioReceso' | 'finReceso';
  horaReal: Date;
  horaPlanificada: Date | null;
  origen: 'manual' | 'foto_ocr' | 'auto';
  nota: string;
  fotoId: number | null;
  confirmadoPorUsuario: boolean;
}

export interface JornadaRow {
  id?: number;
  fecha: string;
  turnoId: number;
  corteId: number | null;
  entradaReal: Date;
  salidaReal: Date;
  minutosReceso: number;
  /** v3: true si el receso no se marco y se desconto la ventana programada. */
  recesoAsumido: boolean;
  /** Tiene minutos de asueto (el asueto va por dia calendario: puede ser solo una parte). */
  esAsueto: boolean;
  /** v5: nombre del asueto (ej. "Dia de los Difuntos"), para resaltarlo en la UI. */
  nombreAsueto?: string | null;
  esDescansoSemanalLaborado: boolean;
  desgloseMinutos: DesgloseMinutos;
  /** v3: tramos continuos por tipo de hora (filas del FO-3106 y redondeo de nomina). */
  tramos: TramoJornada[];
  totalMinutosTrabajados: number;
  /** v3: minutos programados no trabajados (informativo, no se resta del pago). */
  minutosFaltantes: number;
  minutosIgnoradosTolerancia: number;
  advertencias: string[];
  tipoJornadaLegal: 'diurna' | 'nocturna';
  protegida: boolean;
  registrosIds: number[];
}

export interface FotoRow {
  id?: number;
  registroId: number;
  blobWebp: Blob;
  hashSha256: string;
  exifFecha: Date | null;
  discrepancia: boolean;
  tamanoBytes: number;
  creadoEn: Date;
}

export interface ReglaPagoRow extends ReglaPago {
  id?: number;
  vigenteDesde: string;
}

export interface AsuetoRow {
  id?: number;
  fecha: string;
  nombre: string;
  ambito: 'nacional' | 'local';
  esAutomatico: boolean;
}

export interface CorteRow {
  id?: number;
  fechaInicio: string;
  fechaCorte: string;
  fechaPago: string;
  estado: 'abierto' | 'cerrado';
}

export interface DeduccionRow extends ReglaDeduccion {
  id?: number;
}

export interface ResumenHistoricoRow {
  id?: number;
  corteId: number;
  totalesPorTipo: DesgloseMinutos;
  /** v4: horas en decimal de nomina por tipo (suma por tramo). */
  horasPorTipo?: HorasPorTipo;
  /** Monto variable proyectado (lineas de la boleta, sin el salario fijo). */
  montoProyectado: number;
  fechaArchivado: Date;
}

export interface ConfigRetencionRow {
  id: number; // singleton, siempre 1
  diasRetencion: number;
  idsCorteProtegidos: number[];
  idsJornadaProtegidas: number[];
  /** v5: fecha (yyyy-MM-dd) en que se mostro el aviso de limpieza; se limpia 7 dias despues. */
  avisoLimpiezaDesde?: string | null;
}

class BaseDatosHoras extends Dexie {
  perfil!: EntityTable<PerfilRow, 'id'>;
  turnos!: EntityTable<TurnoRow, 'id'>;
  rotaciones!: EntityTable<RotacionRow, 'id'>;
  registros!: EntityTable<RegistroRow, 'id'>;
  jornadas!: EntityTable<JornadaRow, 'id'>;
  fotos!: EntityTable<FotoRow, 'id'>;
  reglasPago!: EntityTable<ReglaPagoRow, 'id'>;
  asuetos!: EntityTable<AsuetoRow, 'id'>;
  cortes!: EntityTable<CorteRow, 'id'>;
  deducciones!: EntityTable<DeduccionRow, 'id'>;
  resumenesHistoricos!: EntityTable<ResumenHistoricoRow, 'id'>;
  configRetencion!: EntityTable<ConfigRetencionRow, 'id'>;

  constructor() {
    super('horasWalmartDB');
    this.version(1).stores({
      perfil: 'id',
      turnos: '++id, nombre, vigenteDesde',
      rotaciones: '++id, fecha, turnoId',
      registros: '++id, fecha, turnoId, tipoEvento',
      jornadas: '++id, fecha, turnoId, corteId',
      fotos: '++id, registroId',
      reglasPago: '++id, tipoHora, vigenteDesde',
      asuetos: '++id, fecha',
      cortes: '++id, fechaInicio, fechaCorte, estado',
      deducciones: '++id, nombre, activo',
      resumenesHistoricos: '++id, corteId',
      configRetencion: 'id',
    });

    // v2: el receso pasa de "minutos" a ventana inicio/fin; horario real de
    // Despacho/Recibo; campos nuevos del perfil. No cambia indices.
    this.version(2).upgrade(async (tx) => {
      let pendiente = false;
      await tx
        .table('turnos')
        .toCollection()
        .modify((turno: { nombre: string; horarioPorDia: (HorarioDiaV1 | HorarioDia)[] }) => {
          const r = migrarHorarioV1(turno.nombre, turno.horarioPorDia as HorarioDiaV1[]);
          turno.horarioPorDia = r.horario;
          if (r.editadoAMano) pendiente = true;
        });
      await tx
        .table('perfil')
        .toCollection()
        .modify((perfil: Partial<PerfilRow>) => {
          perfil.division ??= 'LOG';
          perfil.departamento ??= '';
          perfil.tareaPorDefecto ??= 'Procesos QA';
          perfil.horarioRealPendiente = pendiente;
        });
    });

    // v3: jornada abierta configurable, tolerancia y modo de salario del corte.
    this.version(3).upgrade(async (tx) => {
      await tx
        .table('perfil')
        .toCollection()
        .modify((perfil: Partial<PerfilRow>) => {
          perfil.horasMaxJornadaAbierta ??= 16;
          perfil.toleranciaMin ??= 0;
          perfil.modoSalarioCorte ??= 'mitad';
          // Antes no habia selector de tema: el oscuro pasa a ser el principal (se usa de madrugada).
          if (perfil.tema === 'auto') perfil.tema = 'oscuro';
          perfil.versionCalculo = 1; // fuerza recalcular las jornadas con el motor nuevo
        });
    });

    // v4: reglas de pago con la estructura de la boleta (recargo vs pago completo).
    // Se conservan los factores que el usuario cambio en las lineas que siguen
    // significando lo mismo (pagos completos: extras y extras en asueto).
    this.version(4).upgrade(async (tx) => {
      const viejas = (await tx.table('reglasPago').toArray()) as { tipoHora: string; factor: number }[];
      const factorViejo = new Map(viejas.map((r) => [r.tipoHora, r.factor]));
      await tx.table('reglasPago').clear();
      await tx.table('reglasPago').bulkAdd(
        REGLAS_PAGO_DEFECTO.map((r) => ({
          ...r,
          factor: r.modo === 'completo' ? (factorViejo.get(r.tipoHora) ?? r.factor) : r.factor,
          vigenteDesde: '2020-01-01',
        }))
      );
    });

    // v5: codigos de Walmart en las lineas (TE2, TE2.5, TE2.5_H, TE5.0...),
    // asueto nocturno = TE2.5_H (250 % total -> recargo 1.5) y tolerancia de
    // 6 min (Walmart no paga LLEG-ANT / SALIR_TARDE de hasta ~6 min).
    this.version(5).upgrade(async (tx) => {
      const porTipo = new Map(REGLAS_PAGO_DEFECTO.map((r) => [r.tipoHora, r]));
      await tx
        .table('reglasPago')
        .toCollection()
        .modify((r: ReglaPagoRow) => {
          const defecto = porTipo.get(r.tipoHora);
          if (!defecto) return;
          r.nombreLinea = defecto.nombreLinea;
          r.articuloLey = defecto.articuloLey;
          if (r.tipoHora === 'asuetoNocturna' && r.modo === 'recargo' && r.factor === 1.25) r.factor = 1.5;
        });
      await tx
        .table('perfil')
        .toCollection()
        .modify((perfil: Partial<PerfilRow>) => {
          if (!perfil.toleranciaMin) perfil.toleranciaMin = 6;
        });
    });
  }
}

export const db = new BaseDatosHoras();
