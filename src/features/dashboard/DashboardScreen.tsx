import { lazy, Suspense, useEffect, useState } from 'react';
import { AlertTriangle, Archive, CalendarRange, ChevronDown, Info, Wallet } from 'lucide-react';
import { obtenerDecisionLimpieza } from '../../aplicacion/limpieza';
import { descargarRespaldoZip } from '../../aplicacion/respaldoZip';
import { fechaLocalHoy, formatoFechaLegible, formatoMoneda, horasDecimales, parsearFechaLocal, formatoFechaLocal } from '../../utils/fecha';
import { listarAsuetos, obtenerCorteActivo } from '../../data/repos/configRepo';
import { listarJornadasEntre } from '../../data/repos/registrosRepo';
import { calcularResumenCorte, diasDelCorte, type ResumenCorte } from '../../aplicacion/resumenCorte';
import { cargarAlertas, fechasConFoto } from '../../aplicacion/cargarAlertas';
import type { Alerta } from '../../aplicacion/alertas';
import { useApp } from '../../aplicacion/AppContexto';
import type { CorteRow, JornadaRow } from '../../data/db';
import type { Pestana } from '../../components/BottomNav';
import Tarjeta from '../../components/Tarjeta';
import EstadoVacio from '../../components/EstadoVacio';
import Boton from '../../components/Boton';
import CalendarioMes from './CalendarioMes';

// Recharts pesa: se carga solo cuando el Dashboard muestra el grafico.
const GraficoHorasPorDia = lazy(() => import('./GraficoHorasPorDia'));

function diasTranscurridos(corte: CorteRow): number {
  const inicio = parsearFechaLocal(corte.fechaInicio).getTime();
  const hoy = parsearFechaLocal(fechaLocalHoy()).getTime();
  return Math.min(diasDelCorte(corte), Math.max(0, Math.round((hoy - inicio) / 86_400_000) + 1));
}

export default function DashboardScreen({ onIr }: { onIr: (p: Pestana) => void }) {
  const { perfil, version } = useApp();
  const [corte, setCorte] = useState<CorteRow | null>(null);
  const [resumen, setResumen] = useState<ResumenCorte | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [jornadasMes, setJornadasMes] = useState<JornadaRow[]>([]);
  const [asuetos, setAsuetos] = useState<Set<string>>(new Set());
  const [conFoto, setConFoto] = useState<Set<string>>(new Set());
  const [lineaAbierta, setLineaAbierta] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [porLimpiar, setPorLimpiar] = useState(0);
  const [generandoZip, setGenerandoZip] = useState(false);

  useEffect(() => {
    void (async () => {
      setCargando(true);
      const corteActivo = (await obtenerCorteActivo(fechaLocalHoy())) ?? null;
      setCorte(corteActivo);
      const r = corteActivo?.id ? await calcularResumenCorte(corteActivo.id) : null;
      setResumen(r);
      setAlertas(await cargarAlertas(r));
      const hoy = new Date();
      const ini = formatoFechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      const fin = formatoFechaLocal(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
      const delMes = await listarJornadasEntre(ini, fin);
      setJornadasMes(delMes);
      setAsuetos(new Set((await listarAsuetos()).map((a) => a.fecha)));
      setConFoto(await fechasConFoto(delMes.map((j) => j.fecha)));
      const limpieza = await obtenerDecisionLimpieza();
      setPorLimpiar(limpieza.accion === 'avisar' ? limpieza.proximos.length : 0);
      setCargando(false);
    })();
  }, [version]);

  if (cargando) return <div className="mx-auto mt-10 h-48 max-w-md animate-pulso rounded-4xl bg-superficie" />;

  if (!corte || !resumen) {
    return (
      <EstadoVacio
        icono={<CalendarRange className="h-8 w-8" />}
        titulo="Configura tus cortes de pago"
        texto="Walmart no paga por quincena calendario. Genera tu calendario de cortes en Mas > Cortes de pago para ver tu proyeccion."
        accion={<Boton onClick={() => onIr('mas')}>Ir a configuracion</Boton>}
      />
    );
  }

  const sinSalario = !perfil || perfil.salarioMensual <= 0;
  const total = diasDelCorte(corte);
  const transcurridos = diasTranscurridos(corte);
  const h = resumen.horasTotal;
  const variable = resumen.ingresoBruto - resumen.salarioCorte;
  const proyeccionBruto = transcurridos > 0 ? resumen.salarioCorte + (variable / transcurridos) * total : resumen.ingresoBruto;

  return (
    <div className="pt-segura mx-auto max-w-md space-y-4 px-4 pb-6">
      <header className="py-2">
        <p className="etiqueta">Corte del {formatoFechaLegible(corte.fechaInicio)} al {formatoFechaLegible(corte.fechaCorte)}</p>
        <h1 className="font-display text-xl font-semibold">Tu proximo pago</h1>
      </header>

      <section className="relative overflow-hidden rounded-4xl bg-acento p-5 text-sobre-acento">
        <Wallet className="absolute -right-4 -top-4 h-28 w-28 opacity-10" aria-hidden />
        <p className="text-sm font-semibold opacity-80">Neto estimado</p>
        {sinSalario ? (
          <p className="mt-1 text-sm">Configura tu salario en Mas &gt; Perfil para ver tu proyeccion.</p>
        ) : (
          <p className="num text-5xl font-semibold tracking-tight">{formatoMoneda(resumen.netoEstimado)}</p>
        )}
        <p className="mt-1 text-sm opacity-80">Paga el {formatoFechaLegible(corte.fechaPago)}</p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-sobre-acento/20">
          <div className="h-full rounded-full bg-sobre-acento" style={{ width: `${(transcurridos / total) * 100}%` }} />
        </div>
        <p className="num mt-1.5 flex justify-between text-xs opacity-80">
          <span>Dia {transcurridos} de {total}</span>
          <span>{total - transcurridos} restantes</span>
        </p>
        {!sinSalario && transcurridos < total && (
          <p className="num mt-2 text-xs opacity-90">Al ritmo actual, el bruto cerraria en {formatoMoneda(proyeccionBruto)}.</p>
        )}
      </section>

      {porLimpiar > 0 && (
        <section className="tarjeta flex gap-3 border-aviso/40">
          <Archive className="h-5 w-5 shrink-0 text-aviso" aria-hidden />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Limpieza en menos de 7 dias</p>
            <p className="text-xs text-tenue">
              {porLimpiar} jornada(s) antigua(s) perderan sus fotos y detalle (el resumen del corte se conserva). Descarga el
              respaldo o protege los dias en Registros.
            </p>
            <Boton
              variante="secundario"
              className="mt-2 px-3 py-2"
              disabled={generandoZip}
              onClick={() => {
                setGenerandoZip(true);
                void descargarRespaldoZip().finally(() => setGenerandoZip(false));
              }}
            >
              {generandoZip ? 'Generando...' : 'Descargar respaldo ZIP'}
            </Boton>
          </div>
        </section>
      )}

      {alertas.length > 0 && (
        <section className="space-y-2">
          {alertas.slice(0, 5).map((a, i) => (
            <div key={i} className={`flex gap-3 rounded-2xl p-3 text-sm ${a.gravedad === 'aviso' ? 'bg-aviso/12' : 'bg-elevada'}`}>
              {a.gravedad === 'aviso' ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-aviso" aria-hidden />
              ) : (
                <Info className="h-4 w-4 shrink-0 text-acentotx" aria-hidden />
              )}
              <div>
                <p className="font-semibold">
                  {a.titulo}
                  {a.fecha && <span className="font-normal text-tenue"> - {formatoFechaLegible(a.fecha)}</span>}
                </p>
                <p className="text-xs text-tenue">{a.detalle}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Tarjeta titulo="Ordinarias" tono="acento" valor={horasDecimales(h.ordinariaDiurna + h.ordinariaNocturna)} subtitulo={`${horasDecimales(h.ordinariaNocturna)} nocturnas`} />
        <Tarjeta titulo="Extras diurnas" tono="diurno" valor={horasDecimales(h.extraDiurna)} />
        <Tarjeta titulo="Extras nocturnas" tono="nocturno" valor={horasDecimales(h.extraNocturna)} />
        <Tarjeta
          titulo="Asueto y dia libre"
          tono="asueto"
          valor={horasDecimales(h.asuetoDiurna + h.asuetoNocturna + h.asuetoExtraDiurna + h.asuetoExtraNocturna + h.descansoLaboradoDiurna + h.descansoLaboradoNocturna)}
        />
      </section>

      <section className="tarjeta">
        <p className="etiqueta mb-2">Desglose tipo boleta (estimado)</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-tenue">
              <th className="pb-1 font-semibold">Linea</th>
              <th className="pb-1 text-right font-semibold">Horas</th>
              <th className="pb-1 text-right font-semibold">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde/60">
            <tr>
              <td className="py-2">Salario del corte</td>
              <td />
              <td className="num py-2 text-right">{formatoMoneda(resumen.salarioCorte)}</td>
            </tr>
            {resumen.detalleMontos.map((l) => (
              <tr key={l.tipoHora} onClick={() => setLineaAbierta(lineaAbierta === l.tipoHora ? null : l.tipoHora)} className="cursor-pointer">
                <td className="py-2">
                  <span className="flex items-center gap-1">
                    {l.nombreLinea}
                    <ChevronDown className={`h-3 w-3 text-tenue transition ${lineaAbierta === l.tipoHora ? 'rotate-180' : ''}`} aria-hidden />
                  </span>
                  {lineaAbierta === l.tipoHora && (
                    <span className="num mt-1 block text-[11px] text-tenue">
                      {l.explicacion} - {l.articuloLey}
                      {l.diaCompensatorio ? ' - + dia compensatorio' : ''}
                    </span>
                  )}
                </td>
                <td className="num py-2 text-right align-top">{l.horas.toFixed(2)}</td>
                <td className="num py-2 text-right align-top">{formatoMoneda(l.monto)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Bruto</td>
              <td />
              <td className="num py-2 text-right">{formatoMoneda(resumen.ingresoBruto)}</td>
            </tr>
            {resumen.detalleDeducciones.map((d) => (
              <tr key={d.nombre} className="text-tenue">
                <td className="py-1.5">- {d.nombre}</td>
                <td />
                <td className="num py-1.5 text-right">{formatoMoneda(d.monto)}</td>
              </tr>
            ))}
            <tr className="font-display text-base font-semibold">
              <td className="py-2">Neto estimado</td>
              <td />
              <td className="num py-2 text-right text-acentotx">{formatoMoneda(resumen.netoEstimado)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-tenue">Proyeccion personal: no es la boleta oficial. Hora base {resumen.horaBase.toFixed(3)}.</p>
      </section>

      <section className="tarjeta">
        <p className="etiqueta mb-2">Horas por dia</p>
        <Suspense fallback={<div className="h-60 animate-pulso rounded-2xl bg-elevada" />}>
          <GraficoHorasPorDia jornadas={resumen.jornadas} />
        </Suspense>
      </section>

      <section className="tarjeta">
        <p className="etiqueta mb-2">{new Date().toLocaleDateString('es-SV', { month: 'long', year: 'numeric' })}</p>
        <CalendarioMes mes={new Date()} jornadas={jornadasMes} asuetos={asuetos} conFoto={conFoto} />
      </section>
    </div>
  );
}
