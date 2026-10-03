import { formatEuro } from '../api.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

const KNOPF_UNTER_KACHEL = 'h-12 cursor-pointer rounded-lg border border-schrift-gedimmt/35 px-2 text-center text-[11px] leading-tight text-schrift-gedimmt hover:bg-flaeche-hell disabled:cursor-not-allowed disabled:opacity-40';
const KNOPF_WIEDER_DA = 'h-12 cursor-pointer rounded-lg border border-erfolg/40 bg-erfolg/15 px-2 text-center text-[11px] font-semibold leading-tight text-erfolg-schrift hover:bg-erfolg/25';

export default function ArtikelKachel({ artikel, sprache, texte, laeuft, onTippen, onSonderwunsch, onAusverkauft }) {
  const sonderwunschMoeglich = artikel.beilagen.length === 0 && !artikel.ausverkauft;

  return (
    <div className="flex flex-col gap-1">
      <button onClick={() => onTippen(artikel)} disabled={laeuft || !!artikel.ausverkauft}
        className={`putz-textur-hell kaertchen-schatten-vertieft min-h-32 flex-1 cursor-pointer rounded-[24px] border border-linie bg-flaeche p-4 text-left hover:bg-flaeche-hell active:scale-[0.98] disabled:cursor-not-allowed ${
          artikel.ausverkauft ? 'opacity-50 grayscale' : 'disabled:opacity-40'
        }`}
        style={{ borderTop: `6px solid ${artikel.farbe}` }}>
        <p lang={sprache === 'tr' && artikel.name_tr ? 'tr' : 'de'} className="hyphens-auto break-words text-2xl font-semibold text-schrift">
          {zweisprachigerName(artikel.name, artikel.name_tr, sprache)}
        </p>
        <p className="nummer mt-2 text-xl text-schrift">{formatEuro(artikel.preis_cent)}</p>
        {artikel.ausverkauft ? (
          <p className="mt-1 inline-block rounded-full bg-gefahr px-3 py-0.5 text-sm font-bold text-white">
            {texte.ausverkauft}
          </p>
        ) : (
          artikel.beilagen.length > 0 && (
            <p className="mt-1 text-sm text-schrift-gedimmt">{texte.mitBeilagenAuswahl}</p>
          )
        )}
      </button>
      <div className="grid grid-cols-2 gap-1">
        {sonderwunschMoeglich && (
          <button onClick={() => onSonderwunsch(artikel)} disabled={laeuft} className={KNOPF_UNTER_KACHEL}>
            {texte.sonderwunsch}
          </button>
        )}
        <button onClick={() => onAusverkauft(artikel)}
          className={`${artikel.ausverkauft ? KNOPF_WIEDER_DA : KNOPF_UNTER_KACHEL} ${sonderwunschMoeglich ? '' : 'col-span-2'}`}>
          {artikel.ausverkauft ? texte.wiederVerfuegbar : texte.ausverkauftMelden}
        </button>
      </div>
    </div>
  );
}
