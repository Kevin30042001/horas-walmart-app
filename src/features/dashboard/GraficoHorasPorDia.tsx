import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { JornadaRow } from '../../data/db';
import { horasDeJornada } from '../../aplicacion/resumenCorte';
import { fechaCorta } from '../../utils/fecha';

interface Props {
  jornadas: JornadaRow[];
}

/**
 * Paleta categorica validada (scripts de la guia dataviz) en ambos modos:
 * violeta, naranja, azul y aqua, en orden fijo. Identidad tambien por leyenda
 * y tooltip (nunca solo color).
 */
const SERIES = [
  { clave: 'Ordinarias', claro: '#6250d6', oscuro: '#9085e9' },
  { clave: 'Extra diurna', claro: '#eb6834', oscuro: '#d95926' },
  { clave: 'Extra nocturna', claro: '#2a78d6', oscuro: '#3987e5' },
  { clave: 'Asueto / libre', claro: '#1baf7a', oscuro: '#199e70' },
] as const;

function construirDatos(jornadas: JornadaRow[]) {
  return [...jornadas]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((j) => {
      const h = horasDeJornada(j);
      const r = (n: number) => Math.round(n * 100) / 100;
      return {
        dia: fechaCorta(j.fecha),
        Ordinarias: r(h.ordinariaDiurna + h.ordinariaNocturna),
        'Extra diurna': r(h.extraDiurna),
        'Extra nocturna': r(h.extraNocturna),
        'Asueto / libre': r(
          h.asuetoDiurna + h.asuetoNocturna + h.asuetoExtraDiurna + h.asuetoExtraNocturna + h.descansoLaboradoDiurna + h.descansoLaboradoNocturna
        ),
      };
    });
}

/** Barras apiladas de horas por dia y tipo, para el corte actual. */
export default function GraficoHorasPorDia({ jornadas }: Props) {
  if (jornadas.length === 0) {
    return <p className="p-4 text-center text-xs text-tenue">Todavia no hay jornadas en este corte para graficar.</p>;
  }
  const oscuro = document.documentElement.classList.contains('dark');
  const tinta = oscuro ? '#9ea1b4' : '#585b68';
  const superficie = oscuro ? '#13151f' : '#ffffff';

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={construirDatos(jornadas)} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={tinta} strokeOpacity={0.15} />
          <XAxis dataKey="dia" tick={{ fontSize: 10, fill: tinta }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: tinta }} axisLine={false} tickLine={false} unit="h" />
          <Tooltip
            cursor={{ fill: tinta, fillOpacity: 0.08 }}
            contentStyle={{ background: superficie, border: `1px solid ${tinta}40`, borderRadius: 12, fontSize: 12 }}
            formatter={(v) => `${Number(v).toFixed(2)} h`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            iconSize={8}
            formatter={(valor) => <span style={{ color: tinta }}>{valor}</span>}
          />
          {SERIES.map((s, i) => (
            <Bar
              key={s.clave}
              dataKey={s.clave}
              stackId="horas"
              fill={oscuro ? s.oscuro : s.claro}
              stroke={superficie}
              strokeWidth={2}
              radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={22}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
