import { useState, type ChangeEvent } from 'react';
import { comprimirAWebp, preprocesarParaOcr, calcularSha256 } from '../../utils/imagen';
import { hayDiscrepanciaHoraria } from '../../domain/ocr/discrepancia';
import { guardarFoto, actualizarRegistro } from '../../data/repos/registrosRepo';
import { registrarMarca } from '../../aplicacion/marcado';
import { fechaLocalHoy } from '../../utils/fecha';
import type { AccionMarcado } from '../../aplicacion/estadoDelDia';

interface Props {
  accion: AccionMarcado;
  turnoId: number;
  /** Jornada a la que pertenece la marca (la abierta): NO la fecha de hoy. */
  fechaJornadaSugerida: string;
  onCerrar: () => void;
  onConfirmado: () => void;
}

type Etapa = 'elegir' | 'procesando' | 'confirmar' | 'guardando';

/**
 * Flujo de evidencia fotografica: captura/galeria -> preprocesado -> OCR ->
 * confirmacion/correccion manual OBLIGATORIA -> guardado con hash SHA-256.
 * El valor de OCR NUNCA se guarda sin que el usuario lo confirme.
 */
export default function EvidenciaFotoModal({ accion, turnoId, fechaJornadaSugerida, onCerrar, onConfirmado }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('elegir');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [confianza, setConfianza] = useState(0);
  const [discrepancia, setDiscrepancia] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alElegirArchivo(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivoElegido = evento.target.files?.[0];
    if (!archivoElegido) return;
    setArchivo(archivoElegido);
    setEtapa('procesando');
    setError(null);

    try {
      const preprocesada = await preprocesarParaOcr(archivoElegido);
      const { reconocerTextoDeImagen } = await import('../../ocr/ocrServicio');
      const resultado = await reconocerTextoDeImagen(preprocesada);
      setFecha(resultado.fecha ?? fechaLocalHoy());
      setHora(resultado.hora ?? '');
      setConfianza(resultado.confianza);
      if (resultado.fecha && resultado.hora) {
        setDiscrepancia(
          hayDiscrepanciaHoraria(resultado.fecha, resultado.hora, new Date(archivoElegido.lastModified))
        );
      }
    } catch {
      setError('No se pudo leer la imagen automaticamente. Escribe la fecha y hora manualmente.');
      setFecha(fechaLocalHoy());
    } finally {
      setEtapa('confirmar');
    }
  }

  async function confirmar(): Promise<void> {
    if (!archivo || !hora || !fecha) return;
    setEtapa('guardando');

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const [h, m] = hora.split(':').map(Number);
    const horaReal = new Date(anio!, mes! - 1, dia!, h!, m!);

    const webp = await comprimirAWebp(archivo);
    const hash = await calcularSha256(webp);

    const registroId = await registrarMarca({
      accion,
      horaReal,
      fechaJornada: fechaJornadaSugerida,
      turnoId,
      origen: 'foto_ocr',
    });

    const fotoId = await guardarFoto({
      registroId,
      blobWebp: webp,
      hashSha256: hash,
      exifFecha: new Date(archivo.lastModified),
      discrepancia,
      tamanoBytes: webp.size,
      creadoEn: new Date(),
    });

    await actualizarRegistro(registroId, { fotoId });
    onConfirmado();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/50 sm:items-center sm:justify-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-slate-900 sm:rounded-2xl">
        <h2 className="mb-3 text-lg font-bold">Evidencia de marcacion</h2>

        {etapa === 'elegir' && (
          <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            Tomar foto / elegir de galeria
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void alElegirArchivo(e)}
            />
          </label>
        )}

        {etapa === 'procesando' && <p className="text-center text-sm text-slate-500">Leyendo imagen con OCR...</p>}

        {(etapa === 'confirmar' || etapa === 'guardando') && (
          <div className="space-y-3">
            {error && <p className="text-xs text-amber-600">{error}</p>}
            <p className="text-xs text-slate-400">Confianza del OCR: {Math.round(confianza * 100)}%</p>
            {discrepancia && (
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Atencion: la hora leida no coincide con el momento en que se tomo o eligio la foto. Verifica antes de
                guardar.
              </p>
            )}
            <div>
              <label className="text-xs text-slate-500">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Hora</label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full rounded border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button
              onClick={() => void confirmar()}
              disabled={!hora || etapa === 'guardando'}
              className="w-full rounded-lg bg-marca py-2 font-semibold text-white disabled:opacity-50"
            >
              {etapa === 'guardando' ? 'Guardando...' : 'Confirmar y guardar'}
            </button>
          </div>
        )}

        <button onClick={onCerrar} className="mt-3 w-full text-center text-sm text-slate-400">
          Cancelar
        </button>
      </div>
    </div>
  );
}
