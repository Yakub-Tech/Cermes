import { lesbareSchriftfarbe, dunklereFarbe } from './farbe.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

export default function KaertchenKarte({ kaertchen, zeitText, warnung, onTippen, sprache }) {
  const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);

  return (
    <button onClick={onTippen}
      className={`putz-textur kaertchen-schatten-vertieft w-full rounded-[24px] border p-3 text-center ${
        onTippen ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${warnung ? 'warn-puls' : ''}`}
      style={{
        backgroundColor: kaertchen.artikel_farbe,
        borderColor: dunklereFarbe(kaertchen.artikel_farbe),
        color: schrift,
      }}>
      <span className="nummer block text-5xl">{kaertchen.nummer}</span>
      <span className="mt-1 block text-lg font-semibold">
        {zweisprachigerName(kaertchen.artikel_name, kaertchen.artikel_name_tr, sprache)}
      </span>
      {kaertchen.beilagen.length > 0 && (
        <span className="block text-sm opacity-80">
          {kaertchen.beilagen.map((name, i) => zweisprachigerName(name, kaertchen.beilagen_tr[i], sprache)).join(', ')}
        </span>
      )}
      {zeitText && (
        <span className={`mt-1 block text-sm ${warnung ? 'font-bold' : 'opacity-70'}`}>
          {zeitText}
        </span>
      )}
    </button>
  );
}
