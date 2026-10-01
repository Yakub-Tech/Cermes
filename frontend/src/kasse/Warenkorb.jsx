import { formatEuro } from '../api.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de, tr } from '../sprache/warenkorb.js';
import { de as geparktDe, tr as geparktTr } from '../sprache/geparkt.js';

export default function Warenkorb({ positionen, onMengeAendern, onKassieren, laeuft, fehler, sprache,
  geparktAnzahl, onParken, onGeparkteOeffnen }) {
  const texte = sprache === 'tr' ? tr : de;
  const geparktTexte = sprache === 'tr' ? geparktTr : geparktDe;
  const summe = positionen.reduce((s, p) => s + p.artikel.preis_cent * p.menge, 0);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-linie bg-flaeche">
      <h2 className="border-b border-linie px-4 py-3 font-display text-xl text-navy">{texte.titel}</h2>

      <div className="flex gap-2 border-b border-linie px-4 py-3">
        <button onClick={onParken} disabled={laeuft || positionen.length === 0} title={geparktTexte.parkenErklaerung}
          className="flex-1 cursor-pointer rounded-full border border-linie py-3 text-lg text-navy hover:bg-flaeche-hell disabled:cursor-not-allowed disabled:opacity-40">
          {geparktTexte.parken}
        </button>
        <button onClick={onGeparkteOeffnen} disabled={laeuft}
          className={`flex-1 cursor-pointer rounded-full border py-3 text-lg disabled:cursor-not-allowed disabled:opacity-40 ${
            geparktAnzahl > 0 ? 'border-blau bg-blau font-bold text-flaeche hover:bg-blau-hell' : 'border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
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
              <p className="truncate text-lg">
                {zweisprachigerName(position.artikel.name, position.artikel.name_tr, sprache)}
              </p>
              {position.beilagen.length > 0 && (
                <p className="text-sm text-schrift-gedimmt">
                  {position.beilagen.map((b) => zweisprachigerName(b.name, b.name_tr, sprache)).join(', ')}
                </p>
              )}
              {position.sonderwunsch && (
                <p className="break-words text-sm font-semibold text-weinrot">{position.sonderwunsch}</p>
              )}
            </div>
            <span className="nummer self-center text-lg">
              {formatEuro(position.artikel.preis_cent * position.menge)}
            </span>
            <div className="flex shrink-0 items-center gap-2 self-center">
              <button onClick={() => onMengeAendern(position.schluessel, -1)} disabled={laeuft}
                aria-label={`${position.artikel.name} Menge verringern`}
                className="cursor-pointer rounded-full border border-linie px-3 py-2 text-blau-hell hover:bg-flaeche-hell disabled:cursor-not-allowed disabled:opacity-40">
                −
              </button>
              <span className="nummer w-6 text-center text-lg">{position.menge}</span>
              <button onClick={() => onMengeAendern(position.schluessel, 1)} disabled={laeuft}
                aria-label={`${position.artikel.name} Menge erhöhen`}
                className="cursor-pointer rounded-full border border-linie px-3 py-2 text-blau-hell hover:bg-flaeche-hell disabled:cursor-not-allowed disabled:opacity-40">
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      {fehler && (
        <p className="mx-4 mb-2 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>
      )}

      <div className="border-t border-linie p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-schrift-gedimmt">{texte.gesamt}</span>
          <span className="nummer text-4xl text-navy">{formatEuro(summe)}</span>
        </div>
        <button onClick={onKassieren} disabled={laeuft || positionen.length === 0}
          className="w-full cursor-pointer rounded-full bg-blau py-5 text-2xl font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
          {laeuft ? texte.wirdGebucht : texte.kassieren}
        </button>
      </div>
    </aside>
  );
}
