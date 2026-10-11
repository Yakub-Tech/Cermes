import { offeneMengen } from './offeneMengen.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

export default function OffeneMengenLeiste({ kaertchen, sprache, texte }) {
  const mengen = offeneMengen(kaertchen);
  if (mengen.length === 0) return null;

  return (
    <div className="bg-grund px-3 pt-3">
      <p className="rounded-lg border border-linie bg-flaeche px-4 py-2 text-sm text-schrift-gedimmt">
        <span className="font-semibold text-schrift">{texte.nochZuMachen}</span>{' '}
        {mengen.map((menge, i) => (
          <span key={menge.artikel_name}>
            {menge.anzahl}× {zweisprachigerName(menge.artikel_name, menge.artikel_name_tr, sprache)}
            {i < mengen.length - 1 ? ', ' : ''}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
