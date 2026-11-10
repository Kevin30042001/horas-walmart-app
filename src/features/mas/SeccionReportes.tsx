import { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, ClipboardCheck } from 'lucide-react';
import { listarCortes } from '../../data/repos/configRepo';
import { calcularResumenCorte, type ResumenCorte } from '../../aplicacion/resumenCorte';
import { construirDatosExportacion } from '../../aplicacion/reportes';
import { elegirCorteDelProximoPago } from '../../domain/calculo/cortes';
import { fechaCorta, fechaLocalHoy, formatoMoneda } from '../../utils/fecha';
import type { CorteRow } from '../../data/db';

type Formato = 'fo3106' | 'excel' | 'pdf';

export default function SeccionReportes() {
  const [cortes, setCortes] = useState<CorteRow[]>([]);
  const [corteId, setCorteId] = useState<number | null>(null);
  const [resumen, setResumen] = useState<ResumenCorte | null>(null);
  const [exportando, setExportando] = useState<Formato | null>(null);

  useEffect(() => {
    void listarCortes().then((todos) => {
      setCortes(todos);
      const hoy = fechaLocalHoy();
      setCorteId(elegirCorteDelProximoPago(todos, hoy)?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (corteId) void calcularResumenCorte(corteId).then(setResumen);
  }, [corteId]);

  async function exportar(formato: Formato): Promise<void> {
    if (!resumen) return;
    setExportando(formato);
    try {
      const datos = await construirDatosExportacion(resumen);
      if (!datos) return;
      if (formato === 'fo3106') {
        const { exportarFo3106 } = await import('../../utils/export/fo3106Excel');
        if (datos.fo3106) exportarFo3106(datos.fo3106, datos.etiquetaCorte);
      } else if (formato === 'excel') {
        const { exportarCorteAExcel } = await import('../../utils/export/excel');
        exportarCorteAExcel(datos);
      } else {
        const { exportarCorteAPdf } = await import('../../utils/export/pdf');
        await exportarCorteAPdf(datos);
      }
    } finally {
      setExportando(null);
    }
  }

  const BOTONES: { id: Formato; titulo: string; detalle: string; Icono: typeof FileText }[] = [
    { id: 'fo3106', titulo: 'FO-3106', detalle: 'Preautorizacion de horas extras, dias libres y feriados', Icono: ClipboardCheck },
    { id: 'excel', titulo: 'Excel completo', detalle: 'Resumen, boleta estimada, jornadas y FO-3106', Icono: FileSpreadsheet },
    { id: 'pdf', titulo: 'PDF', detalle: 'Para enviar o imprimir, con miniaturas de evidencias', Icono: FileText },
  ];

  return (
    <section className="tarjeta">
      <p className="etiqueta mb-2">Reportes del corte</p>
      <select value={corteId ?? ''} onChange={(e) => setCorteId(Number(e.target.value))} className="campo num">
        {cortes.length === 0 && <option>Sin cortes configurados</option>}
        {[...cortes].reverse().map((c) => (
          <option key={c.id} value={c.id}>
            {fechaCorta(c.fechaInicio)} al {fechaCorta(c.fechaCorte)} - paga {fechaCorta(c.fechaPago)}
          </option>
        ))}
      </select>
      {resumen && (
        <p className="num mt-2 text-xs text-tenue">
          Bruto {formatoMoneda(resumen.ingresoBruto)} - deducciones {formatoMoneda(resumen.totalDeducciones)} - neto{' '}
          <strong className="text-texto">{formatoMoneda(resumen.netoEstimado)}</strong>
        </p>
      )}
      <div className="mt-3 space-y-2">
        {BOTONES.map(({ id, titulo, detalle, Icono }) => (
          <button
            key={id}
            onClick={() => void exportar(id)}
            disabled={!resumen || exportando !== null}
            className="pulsable flex w-full items-center gap-3 rounded-2xl border border-borde bg-elevada/50 p-3 text-left disabled:opacity-40"
          >
            <span className="rounded-xl bg-acento/15 p-2 text-acentotx">
              <Icono className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{exportando === id ? 'Generando...' : titulo}</span>
              <span className="block text-xs text-tenue">{detalle}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-tenue">Proyeccion personal, no la boleta oficial.</p>
    </section>
  );
}
