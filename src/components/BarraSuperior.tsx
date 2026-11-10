import Chispa from './Chispa';

/** Barra superior con la marca: chispa amarilla + "Mis Horas" + aviso de app no oficial. */
export default function BarraSuperior() {
  return (
    <header className="pt-segura sticky top-0 z-20 border-b border-borde/60 bg-fondo/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center gap-2.5 px-4 pb-2">
        <Chispa className="h-7 w-7 shrink-0" />
        <div className="flex-1 leading-tight">
          <p className="font-display text-base font-bold tracking-tight">
            Mis Horas<span className="text-amarillo">.</span>
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tenue">Uso personal · no oficial</p>
        </div>
      </div>
    </header>
  );
}
