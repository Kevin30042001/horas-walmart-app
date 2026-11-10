import { useEffect, useState } from 'react';
import { obtenerPerfil, guardarPerfil } from '../../data/repos/perfilRepo';
import type { PerfilRow } from '../../data/db';

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
      <label className="text-xs text-slate-500">{etiqueta}</label>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className="w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
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
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  }

  const horaBase = perfil.horasDia > 0 && perfil.diasMes > 0 ? perfil.salarioMensual / perfil.diasMes / perfil.horasDia : 0;

  return (
    <div className="space-y-3">
      <Campo etiqueta="Nombre completo" valor={perfil.nombre} onCambiar={(v) => setPerfil({ ...perfil, nombre: v })} />
      <Campo etiqueta="Gafete" valor={perfil.gafete} onCambiar={(v) => setPerfil({ ...perfil, gafete: v })} />
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
      <p className="text-xs text-slate-400">
        Hora base = salario / {perfil.diasMes} dias / {perfil.horasDia} horas = ${horaBase.toFixed(3)}
      </p>
      <button onClick={() => void guardar()} className="w-full rounded-lg bg-marca py-2 font-semibold text-white">
        {guardado ? 'Guardado' : 'Guardar'}
      </button>
    </div>
  );
}
