import { useState, type ChangeEvent } from 'react';
import { Camera, Loader2, TriangleAlert, X } from 'lucide-react';
import { preprocesarParaOcr } from '../../utils/imagen';
import { leerFechaCaptura, type FechaCaptura } from '../../utils/exif';
import { hayDiscrepanciaHoraria } from '../../domain/ocr/discrepancia';
import { adjuntarFotoARegistro, marcarConFoto } from '../../aplicacion/operacionesJornada';
import { formatoFechaLocal, formatoFechaLegible } from '../../utils/fecha';
import { obtenerEtiquetaAccion, type AccionMarcado } from '../../aplicacion/estadoDelDia';
import Hoja from '../../components/Hoja';
import Boton from '../../components/Boton';

type Props =
  | {
      modo: 'marcar';
      accion: AccionMarcado;
      onCerrar: () => void;
      onConfirmado: (fechaJornada: string) => void;
    }
  | {
      modo: 'adjuntar';
      registroId: number;
      horaRegistrada: Date;
      onCerrar: () => void;
      onConfirmado: () => void;
    };

type Etapa = 'elegir' | 'procesando' | 'confirmar' | 'guardando';

function horaHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Flujo de evidencia fotografica: camara/galeria -> preprocesado -> OCR ->
 * confirmacion OBLIGATORIA -> guardado (WebP + SHA-256 + EXIF real).
 *  - modo 'marcar': la marca va a la jornada de la fecha leida/confirmada.
 *  - modo 'adjuntar': agrega la foto a una marca ya existente (dia pasado).
 * Nunca se guarda un valor de OCR sin que el usuario lo confirme.
 */
export default function EvidenciaFotoModal(props: Props) {
  const [etapa, setEtapa] = useState<Etapa>('elegir');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [confianza, setConfianza] = useState<number | null>(null);
  const [captura, setCaptura] = useState<FechaCaptura | null>(null);
  const [error, setError] = useState<string | null>(null);

  const referencia = props.modo === 'adjuntar' ? props.horaRegistrada : null;

  async function alElegirArchivo(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const elegido = evento.target.files?.[0];
    if (!elegido) return;
    setArchivo(elegido);
    setVistaPrevia(URL.createObjectURL(elegido));
    setEtapa('procesando');
    setError(null);

    const fechaCaptura = await leerFechaCaptura(elegido);
    setCaptura(fechaCaptura);
    const base = referencia ?? fechaCaptura.fecha;
    setFecha(formatoFechaLocal(base));
    setHora(horaHHmm(base));

    try {
      const preprocesada = await preprocesarParaOcr(elegido);
      const { reconocerTextoDeImagen } = await import('../../ocr/ocrServicio');
      const r = await reconocerTextoDeImagen(preprocesada);
      setConfianza(r.confianza);
      if (r.fecha) setFecha(r.fecha);
      if (r.hora) setHora(r.hora);
      if (!r.fecha && !r.hora) setError('No se encontro fecha/hora en la foto. Se propone la hora de captura.');
    } catch {
      setError('No se pudo leer la imagen. Confirma la fecha y hora manualmente.');
    } finally {
      setEtapa('confirmar');
    }
  }

  const discrepancia =
    Boolean(captura && fecha && hora) && hayDiscrepanciaHoraria(fecha, hora, captura!.fecha);
  const discrepanciaConRegistro =
    referencia && fecha && hora ? hayDiscrepanciaHoraria(fecha, hora, referencia) : false;

  async function confirmar(): Promise<void> {
    if (!archivo || !fecha || !hora) return;
    setEtapa('guardando');
    try {
      if (props.modo === 'marcar') {
        const [a, m, d] = fecha.split('-').map(Number);
        const [h, mi] = hora.split(':').map(Number);
        const fechaHora = new Date(a!, m! - 1, d!, h!, mi!);
        const { fechaJornada } = await marcarConFoto({ accion: props.accion, fechaHora, archivo, discrepancia });
        props.onConfirmado(fechaJornada);
      } else {
        await adjuntarFotoARegistro(props.registroId, archivo, discrepancia || discrepanciaConRegistro);
        props.onConfirmado();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
      setEtapa('confirmar');
    }
  }

  const titulo = props.modo === 'marcar' ? `${obtenerEtiquetaAccion(props.accion)} con foto` : 'Adjuntar evidencia';

  return (
    <Hoja titulo={titulo} onCerrar={props.onCerrar}>
      {etapa === 'elegir' && (
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-borde p-8 text-center text-sm text-tenue active:scale-[0.98]">
          <Camera className="h-10 w-10 text-acento" aria-hidden />
          <span>Toma una foto del reloj o comprobante, o elige una de la galeria</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void alElegirArchivo(e)} />
        </label>
      )}

      {etapa === 'procesando' && (
        <div className="flex flex-col items-center gap-3 py-8 text-sm text-tenue">
          <Loader2 className="h-8 w-8 animate-spin text-acento" aria-hidden />
          Leyendo la foto en tu telefono (OCR)...
        </div>
      )}

      {(etapa === 'confirmar' || etapa === 'guardando') && (
        <div className="space-y-3">
          {vistaPrevia && <img src={vistaPrevia} alt="Foto de la marcacion" className="max-h-48 w-full rounded-xl object-contain" />}
          {confianza !== null && (
            <p className="text-xs text-tenue">
              Confianza del OCR: <span className="num font-semibold">{Math.round(confianza * 100)} %</span>
            </p>
          )}
          {captura && (
            <p className="text-xs text-tenue">
              Hora de captura ({captura.fuente === 'exif' ? 'EXIF de la camara' : 'fecha del archivo, sin EXIF'}):{' '}
              <span className="num">{formatoFechaLegible(formatoFechaLocal(captura.fecha))} {horaHHmm(captura.fecha)}</span>
            </p>
          )}
          {error && <p className="text-xs text-aviso">{error}</p>}
          {(discrepancia || discrepanciaConRegistro) && (
            <p className="flex gap-2 rounded-xl bg-aviso/15 p-3 text-xs text-aviso">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
              {discrepancia
                ? 'La hora leida no coincide con la hora en que se tomo la foto. Verifica antes de guardar.'
                : 'La hora leida no coincide con la marca registrada.'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-tenue">
              Fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="campo mt-1" />
            </label>
            <label className="text-xs text-tenue">
              Hora
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="campo mt-1" />
            </label>
          </div>
          {props.modo === 'marcar' && props.accion !== 'entrada' && (
            <p className="text-xs text-tenue">
              Si es una salida de madrugada, se asigna a la jornada del dia en que entraste.
            </p>
          )}
          <Boton onClick={() => void confirmar()} disabled={!fecha || !hora || etapa === 'guardando'} ancho>
            {etapa === 'guardando' ? 'Guardando...' : 'Confirmar y guardar'}
          </Boton>
        </div>
      )}

      <button onClick={props.onCerrar} className="mt-3 flex w-full items-center justify-center gap-1 text-sm text-tenue">
        <X className="h-4 w-4" aria-hidden /> Cancelar
      </button>
    </Hoja>
  );
}
