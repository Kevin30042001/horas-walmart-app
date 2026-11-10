import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { JornadaRow } from '../../data/db';

interface Props {
  jornadas: JornadaRow[];
}

function minutosAHorasDecimal(minutos: number): number {
  return Math.round((minutos / 60) * 10) / 10;
}

function construirDatos(jornadas: JornadaRow[]) {
  return [...jornadas]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((j) => {
      const d = j.desgloseMinutos;
      return {
        dia: j.fecha.slice(5), // MM-DD, alcanza para el eje X de un corte
        Ordinarias: minutosAHorasDecimal(d.ordinariaDiurna + d.ordinariaNocturna),
        Extras: minutosAHorasDecimal(d.extraDiurna + d.extraNocturna),
        'Asueto / Descanso': minutosAHorasDecimal(
          d.asuetoDiurna + d.asuetoNocturna + d.asuetoExtraDiurna + d.asuetoExtraNocturna + d.descansoLaboradoDiurna + d.descansoLaboradoNocturna
        ),
      };
    });
}

/** Barra apilada de horas por dia y tipo, para el corte actual. Altura fija: Recharts ignora el alto del canvas sin esto. */
export default function GraficoHorasPorDia({ jornadas }: Props) {
  if (jornadas.length === 0) {
    return <p className="p-4 text-center text-xs text-slate-400">Todavia no hay jornadas en este corte para graficar.</p>;
  }

  const datos = construirDatos(jornadas);

  return (
    <div className="h-56 w-full rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Ordinarias" stackId="horas" fill="#0071ce" />
          <Bar dataKey="Extras" stackId="horas" fill="#f59e0b" />
          <Bar dataKey="Asueto / Descanso" stackId="horas" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
