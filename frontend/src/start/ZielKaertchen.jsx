import { useNavigate } from 'react-router-dom';

export default function ZielKaertchen({ beschriftung, Icon, pfad }) {
  const navigiere = useNavigate();

  return (
    <button type="button" onClick={() => navigiere(pfad)}
      className="putz-textur-hell flex w-64 cursor-pointer flex-col items-start gap-5 rounded-2xl border border-linie bg-flaeche p-6 text-left shadow-[0_1px_2px_var(--schattenfarbe)] outline-none transition-colors hover:bg-flaeche-hell focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-linie bg-flaeche-hell text-schrift">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <span className="text-2xl font-semibold tracking-tight text-schrift">{beschriftung}</span>
    </button>
  );
}
