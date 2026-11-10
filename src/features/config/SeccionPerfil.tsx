import { useEffect, useState } from 'react';
import { obtenerPerfil, guardarPerfil } from '../../data/repos/perfilRepo';
import type { PerfilRow } from '../../data/db';
import { recalcularTodasLasJornadas } from '../../aplicacion/recalcular';

function Campo({
  etiqueta,
  valor,
  onCambiar,
  tipo = 'text',
}: {
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  tipo?: string;
}) {
  return (
    <div>
      <label className="text-xs text-tenue">{etiqueta}</label>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className="w-full campo"
      />
    </div>
  );
}

export default function SeccionPerfil() {
  const [perfil, setPerfil] = useState<PerfilRow | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    void obtenerPerfil().then(setPerfil);
  }, []);

  if (!perfil) return null;

  async function guardar(): Promise<void> {
    if (!perfil) return;
    await guardarPerfil(perfil);
    await recalcularTodasLasJornadas(); // la tolerancia cambia la clasificacion de extras
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  }

  const horaBase = perfil.horasDia > 0 && perfil.diasMes > 0 ? perfil.salarioMensual / perfil.diasMes / perfil.horasDia : 0;

  return (
    <div className="space-y-3">
      <Campo etiqueta="Nombre completo" valor={perfil.nombre} onCambiar={(v) => setPerfil({ ...perfil, nombre: v })} />
      <Campo etiqueta="Gafete" valor={perfil.gafete} onCambiar={(v) => setPerfil({ ...perfil, gafete: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Division (FO-3106)" valor={perfil.division} onCambiar={(v) => setPerfil({ ...perfil, division: v })} />
        <Campo
          etiqueta="Departamento (FO-3106)"
          valor={perfil.departamento}
          onCambiar={(v) => setPerfil({ ...perfil, departamento: v })}
        />
      </div>
      <Campo
        etiqueta="Tarea realizada por defecto (FO-3106)"
        valor={perfil.tareaPorDefecto}
        onCambiar={(v) => setPerfil({ ...perfil, tareaPorDefecto: v })}
      />
      <Campo
        etiqueta="Salario mensual (USD)"
        tipo="number"
        valor={String(perfil.salarioMensual)}
        onCambiar={(v) => setPerfil({ ...perfil, salarioMensual: Number(v) || 0 })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Dias del mes (formula)"
          tipo="number"
          valor={String(perfil.diasMes)}
          onCambiar={(v) => setPerfil({ ...perfil, diasMes: Number(v) || 30 })}
        />
        <Campo
          etiqueta="Horas del dia (formula)"
          tipo="number"
          valor={String(perfil.horasDia)}
          onCambiar={(v) => setPerfil({ ...perfil, horasDia: Number(v) || 8 })}
        />
      </div>
      <p className="text-xs text-tenue">
        Hora base = salario / {perfil.diasMes} dias / {perfil.horasDia} horas = ${horaBase.toFixed(3)}
      </p>
      <div>
        <label className="text-xs text-tenue">Salario del corte</label>
        <select
          value={perfil.modoSalarioCorte}
          onChange={(e) => setPerfil({ ...perfil, modoSalarioCorte: e.target.value as PerfilRow['modoSalarioCorte'] })}
          className="w-full campo"
        >
          <option value="mitad">Mitad del salario mensual</option>
          <option value="proporcional">Proporcional a los dias del corte</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Tolerancia de extras (min)"
          tipo="number"
          valor={String(perfil.toleranciaMin)}
          onCambiar={(v) => setPerfil({ ...perfil, toleranciaMin: Math.max(0, Number(v) || 0) })}
        />
        <Campo
          etiqueta="Jornada abierta hasta (h)"
          tipo="number"
          valor={String(perfil.horasMaxJornadaAbierta)}
          onCambiar={(v) => setPerfil({ ...perfil, horasMaxJornadaAbierta: Math.max(1, Number(v) || 16) })}
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={perfil.recesoPagadoEnAsueto ?? true}
          onChange={(e) => setPerfil({ ...perfil, recesoPagadoEnAsueto: e.target.checked })}
          className="mt-1 h-4 w-4 accent-[rgb(var(--c-acento))]"
        />
        <span>
          Pagar el receso que cae en dia de asueto
          <span className="block text-xs text-tenue">Como en el sistema de Walmart: esa hora de comida se paga como extra en asueto (TE5.0 / TE4.0).</span>
        </span>
      </label>
      <p className="text-xs text-tenue">
        Tolerancia: en el sistema de Walmart las llegadas y salidas de hasta ~6 min salen como LLEG-ANT / SALIR_TARDE y no se
        pagan como extra.
      </p>
      <button onClick={() => void guardar()} className="pulsable w-full rounded-2xl bg-acento py-3 font-semibold text-sobre-acento">
        {guardado ? 'Guardado' : 'Guardar'}
      </button>
    </div>
  );
}
