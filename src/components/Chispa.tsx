/** Chispa amarilla (seis rayos) dibujada en SVG, para la barra superior. */
export default function Chispa({ className = 'h-7 w-7' }: { className?: string }) {
  const rayo = 'M46.2 37.5 L43.6 11 A6.4 6.4 0 0 1 56.4 11 L53.8 37.5 A3.8 3.8 0 0 1 46.2 37.5 Z';
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {[0, 60, 120, 180, 240, 300].map((g) => (
        <path key={g} d={rayo} fill="#FFC220" transform={`rotate(${g} 50 50)`} />
      ))}
    </svg>
  );
}
