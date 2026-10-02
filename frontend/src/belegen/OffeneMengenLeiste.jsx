import { offeneMengen } from './offeneMengen.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

export default function OffeneMengenLeiste({ kaertchen, sprache, texte }) {
  const mengen = offeneMengen(kaertchen);
  if (mengen.length === 0) return null;

  return (
    <p className="bg-grund px-4 pt-3 text-sm text-schrift-gedimmt">
      <span className="font-semibold">{texte.nochZuMachen}</span>{' '}
      {mengen.map((menge, i) => (
        <span key={menge.artikel_name}>
          {menge.anzahl}× {zweisprachigerName(menge.artikel_name, menge.artikel_name_tr, sprache)}
          {i < mengen.length - 1 ? ', ' : ''}{' '}
        </span>
      ))}
    </p>
  );
}
