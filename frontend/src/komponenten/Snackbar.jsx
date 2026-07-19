import { useEffect } from 'react';

export default function Snackbar({ meldung, onRueckgaengig, onZu }) {
  useEffect(() => {
    const timer = setTimeout(onZu, 5000);
    return () => clearTimeout(timer);
  }, [meldung]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-linie bg-flaeche px-5 py-3 shadow-2xl">
      <span className="text-lg">{meldung}</span>
      {onRueckgaengig && (
        <button onClick={() => { onRueckgaengig(); onZu(); }}
          className="rounded-lg bg-gold px-4 py-2 font-bold text-grund hover:bg-gold-hell">
          Rückgängig
        </button>
      )}
    </div>
  );
}
