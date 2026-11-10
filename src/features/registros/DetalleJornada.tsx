import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Camera, Image, Pencil, Plus, Shield, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react';
import type { JornadaRow, RegistroRow } from '../../data/db';
import { listarRegistrosDelDia, marcarJornadaProtegida, obtenerJornadaPorFecha } from '../../data/repos/registrosRepo';
import { agregarMarcaAJornada, editarMarca, eliminarJornadaCompleta, eliminarMarca } from '../../aplicacion/operacionesJornada';
import { nombreMarca, type AccionMarcado } from '../../aplicacion/estadoDelDia';
import { horasDeJornada } from '../../aplicacion/resumenCorte';
import { useApp } from '../../aplicacion/AppContexto';
import { aDatetimeLocal, desdeDatetimeLocal, duracionHHMM, formatoFechaLegible, parsearFechaLocal } from '../../utils/fecha';
import { minutosADecimal } from '../../domain/tiempo/decimal';
import { NOMBRE_TIPO_HORA } from '../../utils/nombresTipoHora';
import Hoja from '../../components/Hoja';
import Boton from '../../components/Boton';
import EvidenciaFotoModal from '../marcar/EvidenciaFotoModal';
import VisorFoto from './VisorFoto';

const ORDEN: AccionMarcado[] = ['entrada', 'inicioReceso', 'finReceso', 'salida'];

interface Props {
  fecha: string;
  onVolver: () => void;
}

/** Detalle de una jornada: editar/eliminar/agregar marcas, fotos y "por que se pago asi". */
export default function DetalleJornada({ fecha, onVolver }: Props) {
  const { hora, refrescar } = useApp();
  const [jornada, setJornada] = useState<JornadaRow | null>(null);
  const [registros, setRegistros] = useState<RegistroRow[]>([]);
  const [editando, setEditando] = useState<{ registro?: RegistroRow; nueva?: AccionMarcado } | null>(null);
  const [valorEdicion, setValorEdicion] = useState('');
  const [adjuntarA, setAdjuntarA] = useState<RegistroRow | null>(null);
  const [verFoto, setVerFoto] = useState<number | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const cargar = useCallback(async () => {
    setJornada((await obtenerJornadaPorFecha(fecha)) ?? null);
    setRegistros(await listarRegistrosDelDia(fecha));
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function despuesDeCambio(): Promise<void> {
    await cargar();
    refrescar();
  }

  function abrirEdicion(registro?: RegistroRow, nueva?: AccionMarcado): void {
    const base = registro?.horaReal ?? registros.at(-1)?.horaReal ?? parsearFechaLocal(fecha);
    setValorEdicion(aDatetimeLocal(base));
    setEditando({ registro, nueva });
  }

  async function guardarEdicion(): Promise<void> {
    if (!editando || !valorEdicion) return;
    const nuevaHora = desdeDatetimeLocal(valorEdicion);
    if (editando.registro?.id) await editarMarca(editando.registro.id, nuevaHora);
    else if (editando.nueva) await agregarMarcaAJornada(fecha, editando.nueva, nuevaHora);
    setEditando(null);
    await despuesDeCambio();
  }

  const faltantes = ORDEN.filter((a) => !registros.some((r) => r.tipoEvento === a));
  const h = jornada ? horasDeJornada(jornada) : null;

  return (
    <div className="pt-segura mx-auto max-w-md px-4 pb-8">
      <header className="flex items-center gap-2 py-2">
        <button onClick={onVolver} aria-label="Volver" className="pulsable rounded-full p-2 hover:bg-elevada">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-semibold first-letter:uppercase">{formatoFechaLegible(fecha)}</h1>
        {jornada && (
          <button
            onClick={() => void marcarJornadaProtegida(jornada.id!, !jornada.protegida).then(cargar)}
            className={`pulsable flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${jornada.protegida ? 'bg-exito/15 text-exito' : 'bg-elevada text-tenue'}`}
            aria-pressed={jornada.protegida}
          >
            {jornada.protegida ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            {jornada.protegida ? 'Protegida' : 'Proteger'}
          </button>
        )}
      </header>

      {jornada && (
        <section className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-acento/15 px-2.5 py-1 font-semibold text-acento">Jornada {jornada.tipoJornadaLegal}</span>
          {jornada.esAsueto && <span className="rounded-full bg-exito/15 px-2.5 py-1 font-semibold text-exito">Asueto</span>}
          {jornada.esDescansoSemanalLaborado && <span className="rounded-full bg-exito/15 px-2.5 py-1 font-semibold text-exito">Dia libre laborado</span>}
          {jornada.recesoAsumido && <span className="rounded-full bg-elevada px-2.5 py-1 text-tenue">Receso asumido (editable)</span>}
          {jornada.minutosFaltantes > 0 && <span className="rounded-full bg-elevada px-2.5 py-1 text-tenue">Faltante {duracionHHMM(jornada.minutosFaltantes)}</span>}
        </section>
      )}

      <section className="tarjeta">
        <p className="etiqueta mb-2">Marcas</p>
        <ul className="divide-y divide-borde/60">
          {registros.map((r) => (
            <li key={r.id} className="flex items-center gap-2 py-2.5">
              <div className="flex-1">
                <p className="text-sm font-semibold">{nombreMarca(r.tipoEvento)}</p>
                <p className="num text-xs text-tenue">
                  {r.horaReal.toLocaleDateString('es-SV', { weekday: 'short', day: '2-digit', month: '2-digit' })} {hora(r.horaReal)}
                  {r.origen !== 'manual' && ` - ${r.origen === 'foto_ocr' ? 'foto' : 'sugerida'}`}
                  {r.nota && ` - ${r.nota}`}
                </p>
              </div>
              {r.fotoId ? (
                <button onClick={() => setVerFoto(r.fotoId!)} aria-label="Ver foto" className="pulsable rounded-xl bg-acento/15 p-2 text-acento">
                  <Image className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={() => setAdjuntarA(r)} aria-label="Adjuntar foto" className="pulsable rounded-xl p-2 text-tenue hover:bg-elevada">
                  <Camera className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => abrirEdicion(r)} aria-label="Editar hora" className="pulsable rounded-xl p-2 text-tenue hover:bg-elevada">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => void eliminarMarca(r.id!).then(despuesDeCambio)} aria-label="Eliminar marca" className="pulsable rounded-xl p-2 text-peligro hover:bg-peligro/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        {faltantes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {faltantes.map((a) => (
              <button key={a} onClick={() => abrirEdicion(undefined, a)} className="pulsable flex items-center gap-1 rounded-full border border-dashed border-borde px-3 py-1.5 text-xs text-tenue">
                <Plus className="h-3.5 w-3.5" /> {nombreMarca(a)}
              </button>
            ))}
          </div>
        )}
      </section>

      {jornada && h && (
        <section className="tarjeta mt-3">
          <p className="etiqueta mb-2">Por que se pago asi</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-tenue">
                <th className="pb-1 font-semibold">De</th>
                <th className="pb-1 font-semibold">A</th>
                <th className="pb-1 font-semibold">Tipo</th>
                <th className="pb-1 text-right font-semibold">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde/60">
              {jornada.tramos.map((t, i) => (
                <tr key={i} className={t.categoria === 'extra' ? 'text-aviso' : ''}>
                  <td className="num py-1.5">{hora(t.inicio)}</td>
                  <td className="num py-1.5">{hora(t.fin)}</td>
                  <td className="py-1.5 text-xs">{NOMBRE_TIPO_HORA[t.tipoHora]}</td>
                  <td className="num py-1.5 text-right">{minutosADecimal(t.minutos).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="num mt-2 text-right text-sm font-semibold">
            Total {Object.values(h).reduce((a, b) => a + b, 0).toFixed(2)} h
          </p>
          {jornada.advertencias.map((a) => (
            <p key={a} className="mt-2 flex gap-2 text-xs text-tenue">
              <TriangleAlert className="h-4 w-4 shrink-0 text-aviso" aria-hidden /> {a}
            </p>
          ))}
        </section>
      )}

      {!jornada && registros.length > 0 && (
        <p className="mt-3 rounded-2xl bg-aviso/12 p-3 text-sm">Jornada incompleta: agrega la marca que falta para calcularla.</p>
      )}

      <Boton variante="peligro" ancho className="mt-6" icono={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmarBorrado(true)}>
        Eliminar jornada
      </Boton>

      {confirmarBorrado && (
        <Hoja titulo="Eliminar jornada" onCerrar={() => setConfirmarBorrado(false)}>
          <p className="mb-4 text-sm text-tenue">Se borran todas las marcas y fotos de este dia. No se puede deshacer.</p>
          <Boton variante="peligro" ancho onClick={() => void eliminarJornadaCompleta(fecha).then(() => { refrescar(); onVolver(); })}>
            Si, eliminar
          </Boton>
        </Hoja>
      )}

      {editando && (
        <Hoja titulo={editando.registro ? `Editar ${nombreMarca(editando.registro.tipoEvento).toLowerCase()}` : `Agregar ${nombreMarca(editando.nueva!).toLowerCase()}`} onCerrar={() => setEditando(null)}>
          <label className="block text-xs text-tenue">
            Fecha y hora
            <input type="datetime-local" value={valorEdicion} onChange={(e) => setValorEdicion(e.target.value)} className="campo mt-1" />
          </label>
          <p className="mt-2 text-[11px] text-tenue">La marca sigue perteneciendo a la jornada del {formatoFechaLegible(fecha)}, aunque sea de madrugada.</p>
          <Boton ancho className="mt-3" onClick={() => void guardarEdicion()}>
            Guardar y recalcular
          </Boton>
        </Hoja>
      )}

      {adjuntarA && (
        <EvidenciaFotoModal
          modo="adjuntar"
          registroId={adjuntarA.id!}
          horaRegistrada={adjuntarA.horaReal}
          onCerrar={() => setAdjuntarA(null)}
          onConfirmado={() => {
            setAdjuntarA(null);
            void despuesDeCambio();
          }}
        />
      )}
      {verFoto !== null && <VisorFoto fotoId={verFoto} onCerrar={() => setVerFoto(null)} />}
    </div>
  );
}
