import { useEffect, useState, type ReactNode } from 'react';
import { fechaLocalHoy, formatoFechaLegible, formatoMoneda, minutosAHoras, parsearFechaLocal } from '../../utils/fecha';
import { obtenerCorteActivo } from '../../data/repos/configRepo';
import { listarRegistrosDelDia } from '../../data/repos/registrosRepo';
import { calcularResumenCorte, type ResumenCorte } from '../../aplicacion/resumenCorte';
import Tarjeta from '../../components/Tarjeta';
import type { CorteRow } from '../../data/db';

function Centro({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6 text-center text-slate-500">{children}</div>;
}

function calcularProgresoCorte(corte: CorteRow): number {
  const inicio = parsearFechaLocal(corte.fechaInicio).getTime();
  const fin = parsearFechaLocal(corte.fechaCorte).getTime();
  const hoy = Date.now();
  if (hoy <= inicio) return 0;
  if (hoy >= fin) return 100;
  return Math.round(((hoy - inicio) / (fin - inicio)) * 100);
}

function sumarHorasAsuetoYDescanso(r: ResumenCorte): number {
  const d = r.desgloseTotal;
  return (
    d.asuetoDiurna +
    d.asuetoNocturna +
    d.asuetoExtraDiurna +
    d.asuetoExtraNocturna +
    d.descansoLaboradoDiurna +
    d.descansoLaboradoNocturna
  );
}

export default function DashboardScreen() {
  const [corte, setCorte] = useState<CorteRow | null>(null);
  const [resumen, setResumen] = useState<ResumenCorte | null>(null);
  const [alertaMarcacionOlvidada, setAlertaMarcacionOlvidada] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    setCargando(true);
    const hoy = fechaLocalHoy();
    const corteActivo = await obtenerCorteActivo(hoy);
    setCorte(corteActivo ?? null);
    if (corteActivo?.id) {
      setResumen(await calcularResumenCorte(corteActivo.id));
    }

    const registrosHoy = await listarRegistrosDelDia(hoy);
    const hayEntrada = registrosHoy.some((r) => r.tipoEvento === 'entrada');
    const haySalida = registrosHoy.some((r) => r.tipoEvento === 'salida');
    setAlertaMarcacionOlvidada(hayEntrada && !haySalida && new Date().getHours() >= 12);
    setCargando(false);
  }

  if (cargando) return <Centro>Cargando...</Centro>;
  if (!corte) {
    return (
      <Centro>
        No hay ningun corte configurado todavia. Ve a Configuracion {'>'} Cortes para generar el calendario de pago.
      </Centro>
    );
  }

  const progreso = calcularProgresoCorte(corte);

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold">Mis Horas</h1>
        <p className="text-sm capitalize text-slate-500">{formatoFechaLegible(fechaLocalHoy())}</p>
      </header>

      {alertaMarcacionOlvidada && (
        <div className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Atencion: marcaste entrada hoy pero todavia no tienes salida registrada.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold">
          Corte {corte.fechaInicio} al {corte.fechaCorte}
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-2 rounded-full bg-marca" style={{ width: `${progreso}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {progreso}% transcurrido - paga el {corte.fechaPago}
        </p>
      </section>

      {resumen && (
        <section className="grid grid-cols-2 gap-3">
          <Tarjeta
            titulo="Ordinarias"
            valor={minutosAHoras(resumen.desgloseTotal.ordinariaDiurna + resumen.desgloseTotal.ordinariaNocturna)}
          />
          <Tarjeta
            titulo="Extras"
            tono="alerta"
            valor={minutosAHoras(resumen.desgloseTotal.extraDiurna + resumen.desgloseTotal.extraNocturna)}
          />
          <Tarjeta titulo="Asueto / Descanso" valor={minutosAHoras(sumarHorasAsuetoYDescanso(resumen))} />
          <Tarjeta
            titulo="Total horas"
            valor={minutosAHoras(resumen.jornadas.reduce((acc, j) => acc + j.totalMinutosTrabajados, 0))}
          />
          <Tarjeta titulo="Bruto proyectado" tono="exito" valor={formatoMoneda(resumen.ingresoBruto)} />
          <Tarjeta
            titulo="Neto estimado"
            tono="exito"
            valor={formatoMoneda(resumen.netoEstimado)}
            subtitulo={`Deducciones: ${formatoMoneda(resumen.totalDeducciones)}`}
          />
        </section>
      )}
    </div>
  );
}
