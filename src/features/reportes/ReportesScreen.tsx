import { useEffect, useState } from 'react';
import { listarCortes } from '../../data/repos/configRepo';
import { listarTurnos, obtenerPerfil } from '../../data/repos/perfilRepo';
import { calcularResumenCorte, type ResumenCorte } from '../../aplicacion/resumenCorte';
import type { DatosExportacionCorte } from '../../utils/export/excel';
import { formatoMoneda } from '../../utils/fecha';
import { construirFo3106DeCorte } from '../../aplicacion/reportes';
import type { CorteRow } from '../../data/db';

export default function ReportesScreen() {
  const [cortes, setCortes] = useState<CorteRow[]>([]);
  const [corteId, setCorteId] = useState<number | null>(null);
  const [resumen, setResumen] = useState<ResumenCorte | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    void cargarCortes();
  }, []);

  useEffect(() => {
    if (corteId) void cargarResumen(corteId);
  }, [corteId]);

  async function cargarCortes(): Promise<void> {
    const todos = await listarCortes();
    setCortes(todos);
    setCorteId(todos.at(-1)?.id ?? null);
  }

  async function cargarResumen(id: number): Promise<void> {
    setResumen(await calcularResumenCorte(id));
  }

  async function construirDatosExportacion(): Promise<DatosExportacionCorte | null> {
    if (!resumen || !corteId) return null;
    const corte = cortes.find((c) => c.id === corteId);
    if (!corte) return null;

    const [turnos, perfil] = await Promise.all([listarTurnos(), obtenerPerfil()]);
    const nombreTurnoPorId = Object.fromEntries(turnos.filter((t) => t.id).map((t) => [t.id as number, t.nombre]));

    return {
      resumen,
      nombreTurnoPorId,
      nombreColaborador: perfil.nombre || 'Sin nombre configurado',
      gafete: perfil.gafete,
      etiquetaCorte: `${corte.fechaInicio}_al_${corte.fechaCorte}`,
      fo3106: await construirFo3106DeCorte(resumen),
    };
  }

  async function exportar(formato: 'excel' | 'pdf' | 'fo3106'): Promise<void> {
    setExportando(true);
    try {
      const datos = await construirDatosExportacion();
      if (!datos) return;
      if (formato === 'fo3106') {
        const { exportarFo3106 } = await import('../../utils/export/fo3106Excel');
        if (datos.fo3106) exportarFo3106(datos.fo3106, datos.etiquetaCorte);
      } else if (formato === 'excel') {
        const { exportarCorteAExcel } = await import('../../utils/export/excel');
        exportarCorteAExcel(datos);
      } else {
        const { exportarCorteAPdf } = await import('../../utils/export/pdf');
        exportarCorteAPdf(datos);
      }
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold">Reportes</h1>

      <select
        value={corteId ?? ''}
        onChange={(e) => setCorteId(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
      >
        {cortes.length === 0 && <option>Sin cortes configurados</option>}
        {cortes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.fechaInicio} al {c.fechaCorte}
          </option>
        ))}
      </select>

      {resumen && (
        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
          <p>
            Bruto proyectado: <strong>{formatoMoneda(resumen.ingresoBruto)}</strong>
          </p>
          <p>
            Deducciones estimadas: <strong>{formatoMoneda(resumen.totalDeducciones)}</strong>
          </p>
          <p>
            Neto estimado: <strong>{formatoMoneda(resumen.netoEstimado)}</strong>
          </p>
        </div>
      )}

      <button
        onClick={() => void exportar('fo3106')}
        disabled={!resumen || exportando}
        className="w-full rounded-lg bg-marca py-2 font-semibold text-white disabled:opacity-50"
      >
        Descargar FO-3106 (preautorizacion de horas extras)
      </button>
      <div className="flex gap-3">
        <button
          onClick={() => void exportar('excel')}
          disabled={!resumen || exportando}
          className="flex-1 rounded-lg bg-emerald-600 py-2 font-semibold text-white disabled:opacity-50"
        >
          Descargar Excel
        </button>
        <button
          onClick={() => void exportar('pdf')}
          disabled={!resumen || exportando}
          className="flex-1 rounded-lg bg-rose-600 py-2 font-semibold text-white disabled:opacity-50"
        >
          Descargar PDF
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Ideal para enviar al jefe y respaldar solicitudes de horas extras. Es una proyeccion personal, no la boleta
        oficial.
      </p>
    </div>
  );
}
