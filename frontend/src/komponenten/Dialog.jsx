export default function Dialog({ titel, kinder, children, onSchliessen }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-2.5"
      onClick={onSchliessen}>
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg border border-linie bg-flaeche p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {titel && <h2 className="mb-2.5 font-display text-base text-navy">{titel}</h2>}
        {kinder ?? children}
      </div>
    </div>
  );
}
