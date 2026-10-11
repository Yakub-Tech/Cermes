import { useEffect } from 'react';
import { de, tr } from '../sprache/gemeinsam.js';

export default function Snackbar({ meldung, onRueckgaengig, onZu, sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  useEffect(() => {
    const timer = setTimeout(onZu, 5000);
    return () => clearTimeout(timer);
  }, [meldung]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-linie bg-flaeche px-5 py-3 shadow-2xl">
      <span className="text-lg text-schrift">{meldung}</span>
      {onRueckgaengig && (
        <button onClick={() => { onRueckgaengig(); onZu(); }}
          className="cursor-pointer rounded-lg bg-haupt px-4 py-2 font-bold text-haupt-text hover:bg-haupt-hover">
          {texte.rueckgaengig}
        </button>
      )}
    </div>
  );
}
