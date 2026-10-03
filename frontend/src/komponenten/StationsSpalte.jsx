export default function StationsSpalte({ titel, anzahl, betont = false, children }) {
  return (
    <section className="kaertchen-schatten flex min-h-0 flex-col overflow-hidden rounded-xl border border-linie bg-flaeche">
      <div className="flex items-center justify-between border-b border-linie px-4 py-3">
        <h2 className="font-display text-xl font-semibold tracking-tight text-schrift">{titel}</h2>
        <span className={`nummer rounded-full px-3 py-0.5 text-base ${
          betont ? 'bg-haupt text-haupt-text' : 'bg-flaeche-hell text-schrift-gedimmt'
        }`}>
          {anzahl}
        </span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 pt-3 pb-4">
        {children}
      </div>
    </section>
  );
}
