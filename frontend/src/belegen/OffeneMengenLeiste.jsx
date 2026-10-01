import { offeneMengen, wartezeitText } from './offeneMengen.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

export default function OffeneMengenLeiste({ kaertchen, jetzt, sprache, texte }) {
  const mengen = offeneMengen(kaertchen);
  if (mengen.length === 0) return null;

  return (
    <p className="bg-grund px-4 pt-3 text-sm text-schrift-gedimmt">
      <span className="font-semibold">{texte.nochZuMachen}</span>{' '}
      {mengen.map((menge, i) => {
        const wartezeit = wartezeitText(menge.aeltestes_seit, jetzt, texte);
        return (
          <span key={menge.artikel_name} className="whitespace-nowrap">
            {menge.anzahl}× {zweisprachigerName(menge.artikel_name, menge.artikel_name_tr, sprache)}
            {wartezeit && <span className="opacity-70"> ({wartezeit})</span>}
            {i < mengen.length - 1 ? ', ' : ''}{' '}
          </span>
        );
      })}
    </p>
  );
}
