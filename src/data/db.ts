import Dexie, { type EntityTable } from 'dexie';
import type { DesgloseMinutos, HorarioProgramado, ReglaDeduccion, TipoHora } from '../domain/tipos';
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
  esAsueto: boolean;
  esDescansoSemanalLaborado: boolean;
  desgloseMinutos: DesgloseMinutos;
  totalMinutosTrabajados: number;
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

export interface ReglaPagoRow {
  id?: number;
  tipoHora: TipoHora;
  factor: number;
  articuloLey: string;
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
  montoProyectado: number;
  fechaArchivado: Date;
}

export interface ConfigRetencionRow {
  id: number; // singleton, siempre 1
  diasRetencion: number;
  idsCorteProtegidos: number[];
  idsJornadaProtegidas: number[];
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
          perfil.versionCalculo = 1; // fuerza recalcular las jornadas con el motor nuevo
        });
    });
  }
}

export const db = new BaseDatosHoras();
