import { formatEuro } from '../api.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de, tr } from '../sprache/warenkorb.js';
import { de as geparktDe, tr as geparktTr } from '../sprache/geparkt.js';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import { KNOPF_NEBEN, KNOPF_HAUPT } from './knopfKlassen.js';

export default function Warenkorb({ positionen, onMengeAendern, onKassieren, laeuft, fehler, sprache,
  geparktAnzahl, onParken, onGeparkteOeffnen }) {
  const texte = sprache === 'tr' ? tr : de;
  const geparktTexte = sprache === 'tr' ? geparktTr : geparktDe;
  const summe = positionen.reduce((s, p) => s + p.artikel.preis_cent * p.menge, 0);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-linie bg-flaeche">
      <h2 className="border-b border-linie px-4 py-3 font-display text-xl font-semibold tracking-tight text-schrift">{texte.titel}</h2>

      <div className="flex gap-2 border-b border-linie px-4 py-3">
        <button onClick={onParken} disabled={laeuft || positionen.length === 0} title={geparktTexte.parkenErklaerung}
          className={`${KNOPF_NEBEN} flex-1 py-3 text-lg text-schrift`}>
          {geparktTexte.parken}
        </button>
        <button onClick={onGeparkteOeffnen} disabled={laeuft}
          className={`flex-1 py-3 text-lg ${
            geparktAnzahl > 0 ? `${KNOPF_HAUPT} font-bold` : `${KNOPF_NEBEN} text-schrift-gedimmt`
          }`}>
          {geparktTexte.knopf} ({geparktAnzahl})
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {positionen.length === 0 && (
          <li className="px-4 py-6 text-schrift-gedimmt">
            {texte.leer}
          </li>
        )}
        {positionen.map((position) => (
          <li key={position.schluessel}
            className="flex gap-3 border-b border-linie px-4 py-3">
            <span className="w-1.5 shrink-0 rounded"
              style={{ backgroundColor: position.artikel.farbe }} />
            <div className="min-w-0 flex-1 self-center">
              <p className="truncate text-lg text-schrift">
                {zweisprachigerName(position.artikel.name, position.artikel.name_tr, sprache)}
              </p>
              {position.beilagen.length > 0 && (
                <p className="text-sm text-schrift-gedimmt">
                  {position.beilagen.map((b) => zweisprachigerName(b.name, b.name_tr, sprache)).join(', ')}
                </p>
              )}
              {position.sonderwunsch && (
                <p className="break-words text-sm font-semibold text-gefahr-schrift">{position.sonderwunsch}</p>
              )}
            </div>
            <span className="nummer self-center text-lg text-schrift">
              {formatEuro(position.artikel.preis_cent * position.menge)}
            </span>
            <div className="flex shrink-0 items-center gap-2 self-center">
              <button onClick={() => onMengeAendern(position.schluessel, -1)} disabled={laeuft}
                aria-label={`${position.artikel.name} Menge verringern`}
                className={`${KNOPF_NEBEN} px-3 py-2 text-schrift`}>
                −
              </button>
              <span className="nummer w-6 text-center text-lg text-schrift">{position.menge}</span>
              <button onClick={() => onMengeAendern(position.schluessel, 1)} disabled={laeuft}
                aria-label={`${position.artikel.name} Menge erhöhen`}
                className={`${KNOPF_NEBEN} px-3 py-2 text-schrift`}>
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      {fehler && (
        <Hinweiskasten art="fehler" className="mx-4 mb-2">{fehler}</Hinweiskasten>
      )}

      <div className="border-t border-linie p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-schrift-gedimmt">{texte.gesamt}</span>
          <span className="nummer text-4xl text-schrift">{formatEuro(summe)}</span>
        </div>
        <button onClick={onKassieren} disabled={laeuft || positionen.length === 0}
          className={`${KNOPF_HAUPT} w-full py-5 text-2xl font-bold`}>
          {laeuft ? texte.wirdGebucht : texte.kassieren}
        </button>
      </div>
    </aside>
  );
}
