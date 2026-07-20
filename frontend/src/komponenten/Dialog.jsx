export default function Dialog({ titel, kinder, children, onSchliessen }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
      onClick={onSchliessen}>
      <div className="w-full max-w-lg rounded-xl border border-linie bg-flaeche p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {titel && <h2 className="mb-4 font-display text-2xl text-navy">{titel}</h2>}
        {kinder ?? children}
      </div>
    </div>
  );
}
