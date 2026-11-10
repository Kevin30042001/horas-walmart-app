import { useEffect, useState } from 'react';
import { Archive, HardDrive, Shield, ShieldCheck } from 'lucide-react';
import { obtenerConfigRetencion, guardarConfigRetencion, listarCortes } from '../../data/repos/configRepo';
import { ejecutarLimpieza, obtenerDecisionLimpieza, obtenerUsoAlmacenamiento } from '../../aplicacion/limpieza';
import { generarArchivoRespaldoZip } from '../../aplicacion/respaldoZip';
import { entregarArchivo } from '../../utils/entregarArchivo';
import { useEntregaArchivo } from '../../components/useEntregaArchivo';
import PanelArchivo from '../../components/PanelArchivo';
import { fechaCorta } from '../../utils/fecha';
import type { CorteRow } from '../../data/db';
import type { DecisionLimpieza } from '../../domain/calculo/retencion';
import Boton from '../../components/Boton';

/**
 * Limpieza automatica (60 dias por defecto): 7 dias antes avisa y ofrece el
 * respaldo ZIP; borra fotos y detalle pero conserva el resumen por corte.
 * Dias y cortes protegidos nunca se borran.
 */
export default function SeccionRetencion() {
  const [diasRetencion, setDiasRetencion] = useState(60);
  const [decision, setDecision] = useState<DecisionLimpieza | null>(null);
  const [cortes, setCortes] = useState<CorteRow[]>([]);
  const [protegidos, setProtegidos] = useState<number[]>([]);
  const [uso, setUso] = useState<{ usadoMB: number; cuotaMB: number } | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    const config = await obtenerConfigRetencion();
    setDiasRetencion(config.diasRetencion);
    setProtegidos(config.idsCorteProtegidos);
    setDecision(await obtenerDecisionLimpieza());
    setCortes(await listarCortes());
    setUso(await obtenerUsoAlmacenamiento());
  }

  async function guardarDias(valor: number): Promise<void> {
    setDiasRetencion(valor);
    await guardarConfigRetencion({ diasRetencion: valor });
    await cargar();
  }

  async function alternarCorte(id: number): Promise<void> {
    const nuevos = protegidos.includes(id) ? protegidos.filter((x) => x !== id) : [...protegidos, id];
    await guardarConfigRetencion({ idsCorteProtegidos: nuevos });
    await cargar();
  }

  const entrega = useEntregaArchivo();

  async function respaldarZip(): Promise<void> {
    setMensaje(null);
    await entrega.generar('zip', generarArchivoRespaldoZip);
  }

  async function respaldarYLimpiar(): Promise<void> {
    setProcesando(true);
    try {
      // primero el respaldo: si no se pudo generar, no se limpia nada
      await entregarArchivo(await generarArchivoRespaldoZip());
      const r = await ejecutarLimpieza();
      await guardarConfigRetencion({ avisoLimpiezaDesde: null });
      setMensaje(`Listo: ${r.jornadasEliminadas} jornada(s) limpiadas; se conservo el resumen de ${r.cortesResumidos} corte(s).`);
      await cargar();
    } finally {
      setProcesando(false);
    }
  }

  const candidatos = decision?.candidatos.length ?? 0;
  const proximos = decision?.proximos.length ?? 0;

  return (
    <div className="space-y-4">
      <label className="block text-xs text-tenue">
        Dias que se guarda el detalle (fotos y marcas)
        <input type="number" min={14} value={diasRetencion} onChange={(e) => void guardarDias(Number(e.target.value) || 60)} className="campo mt-1" />
      </label>

      {uso && (
        <div>
          <p className="flex items-center gap-1.5 text-xs text-tenue">
            <HardDrive className="h-4 w-4" aria-hidden /> Almacenamiento: <span className="num">{uso.usadoMB} MB de {uso.cuotaMB} MB</span>
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevada">
            <div className="h-full bg-acento" style={{ width: `${Math.min(100, (uso.usadoMB / Math.max(uso.cuotaMB, 1)) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className={`rounded-2xl p-3 text-sm ${proximos > 0 ? 'bg-aviso/12' : 'bg-elevada'}`}>
        <p className="font-semibold">
          {proximos === 0
            ? 'Nada que limpiar en los proximos 7 dias.'
            : candidatos > 0
              ? `${candidatos} jornada(s) ya pasaron los ${diasRetencion} dias.`
              : `${proximos} jornada(s) se limpiaran en menos de 7 dias.`}
        </p>
        <p className="mt-1 text-xs text-tenue">
          La limpieza es automatica: avisa 7 dias antes y nunca borra sin avisar. Se borran fotos y detalle; el total de
          horas y el monto de cada corte se conservan para el historico.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Boton variante="secundario" icono={<Archive className="h-4 w-4" />} disabled={procesando || entrega.generando !== null} onClick={() => void respaldarZip()}>
          {entrega.generando ? 'Generando...' : 'Respaldo ZIP'}
        </Boton>
        <Boton variante="peligro" disabled={candidatos === 0 || procesando} onClick={() => void respaldarYLimpiar()}>
          {procesando ? 'Procesando...' : 'Respaldar y limpiar'}
        </Boton>
      </div>
      <PanelArchivo entrega={entrega} />
      {mensaje && <p className="text-xs text-exito">{mensaje}</p>}

      {cortes.length > 0 && (
        <div>
          <p className="etiqueta mb-2">Proteger cortes completos</p>
          <div className="flex flex-wrap gap-2">
            {[...cortes].reverse().slice(0, 12).map((c) => {
              const activo = protegidos.includes(c.id!);
              return (
                <button
                  key={c.id}
                  onClick={() => void alternarCorte(c.id!)}
                  aria-pressed={activo}
                  className={`pulsable num flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${activo ? 'bg-exito/15 text-exito' : 'bg-elevada text-tenue'}`}
                >
                  {activo ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                  {fechaCorta(c.fechaInicio)} - {fechaCorta(c.fechaCorte)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-tenue">Para proteger un solo dia, abrelo en Registros y toca "Proteger".</p>
        </div>
      )}
    </div>
  );
}
