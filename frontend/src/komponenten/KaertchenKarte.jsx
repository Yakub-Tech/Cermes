import { lesbareSchriftfarbe } from './farbe.js';

export default function KaertchenKarte({ kaertchen, zeitText, warnung, onTippen }) {
  const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);

  return (
    <button onClick={onTippen}
      className={`relative w-full rounded-2xl p-3 text-center shadow-lg ${
        onTippen ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${warnung ? 'warn-puls' : ''}`}
      style={{ backgroundColor: kaertchen.artikel_farbe, color: schrift }}>
      <span className="nummer block text-5xl">{kaertchen.nummer}</span>
      <span className="mt-1 block text-lg font-semibold">{kaertchen.artikel_name}</span>
      {kaertchen.beilagen.length > 0 && (
        <span className="block text-sm opacity-80">{kaertchen.beilagen.join(', ')}</span>
      )}
      {zeitText && (
        <span className={`mt-1 block text-sm ${warnung ? 'font-bold' : 'opacity-70'}`}>
          {zeitText}
        </span>
      )}
    </button>
  );
}
