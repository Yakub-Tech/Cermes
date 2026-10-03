export default function Zahlenfeld({ wert, onWahl, min, id, autoFokus = false, klasse = 'w-20' }) {
  function schritt(richtung) {
    const naechsteZahl = (Number(wert) || 0) + richtung;
    if (min !== undefined && naechsteZahl < Number(min)) return;
    onWahl(String(naechsteZahl));
  }

  return (
    <div className={`flex items-stretch overflow-hidden rounded-lg border border-linie bg-flaeche-hell focus-within:border-schrift-gedimmt focus-within:ring-3 focus-within:ring-schrift/10 ${klasse}`}>
      <input id={id} type="number" min={min} value={wert} autoFocus={autoFokus}
        onChange={(e) => onWahl(e.target.value)}
        className="w-full min-w-0 border-none bg-transparent px-2 py-1.5 text-sm text-schrift outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <div className="flex flex-col border-l border-linie">
        <button type="button" onClick={() => schritt(1)}
          className="flex flex-1 cursor-pointer items-center justify-center px-1.5 text-xs text-schrift-gedimmt hover:bg-linie">
          ▲
        </button>
        <button type="button" onClick={() => schritt(-1)}
          className="flex flex-1 cursor-pointer items-center justify-center border-t border-linie px-1.5 text-xs text-schrift-gedimmt hover:bg-linie">
          ▼
        </button>
      </div>
    </div>
  );
}
