import { formatEuro } from '../api.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

const KNOPF_UNTER_KACHEL = 'h-12 cursor-pointer rounded-lg border border-schrift-gedimmt/35 px-2 text-center text-[11px] leading-tight text-schrift-gedimmt hover:bg-flaeche-hell disabled:cursor-not-allowed disabled:opacity-40';
const KNOPF_WIEDER_DA = 'h-12 cursor-pointer rounded-lg border border-erfolg/40 bg-erfolg/15 px-2 text-center text-[11px] font-semibold leading-tight text-erfolg-schrift hover:bg-erfolg/25';

export default function ArtikelKachel({ artikel, sprache, texte, laeuft, onTippen, onSonderwunsch, onAusverkauft }) {
  const sonderwunschMoeglich = artikel.beilagen.length === 0 && !artikel.ausverkauft;

  return (
    <div className="@container flex flex-col gap-1">
      <div className="relative flex flex-1">
        <button onClick={() => onTippen(artikel)} disabled={laeuft || !!artikel.ausverkauft}
          className={`putz-textur-hell kaertchen-schatten-vertieft min-h-32 flex-1 cursor-pointer rounded-[24px] border border-linie bg-flaeche p-3 text-left hover:bg-flaeche-hell active:scale-[0.98] disabled:cursor-not-allowed @[9rem]:p-4 ${
            artikel.ausverkauft ? 'pb-11 opacity-50 grayscale @[9rem]:pb-11' : 'disabled:opacity-40'
          }`}
          style={{ borderTop: `6px solid ${artikel.farbe}` }}>
          <p lang={sprache === 'tr' && artikel.name_tr ? 'tr' : 'de'} className="hyphens-auto break-words text-lg font-semibold text-schrift @[9rem]:text-2xl">
            {zweisprachigerName(artikel.name, artikel.name_tr, sprache)}
          </p>
          <p className="nummer mt-2 text-xl text-schrift">{formatEuro(artikel.preis_cent)}</p>
          {!artikel.ausverkauft && artikel.beilagen.length > 0 && (
            <p className="mt-1 text-sm text-schrift-gedimmt">{texte.mitBeilagenAuswahl}</p>
          )}
        </button>
        {!!artikel.ausverkauft && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-full bg-gefahr-fuellung px-2 py-0.5 text-center text-xs font-bold text-white shadow-md @[9rem]:text-sm ring-2 ring-white/70">
            {texte.ausverkauft}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-1 @[11rem]:grid-cols-2">
        {sonderwunschMoeglich && (
          <button onClick={() => onSonderwunsch(artikel)} disabled={laeuft} className={KNOPF_UNTER_KACHEL}>
            {texte.sonderwunsch}
          </button>
        )}
        <button onClick={() => onAusverkauft(artikel)}
          className={`${artikel.ausverkauft ? KNOPF_WIEDER_DA : KNOPF_UNTER_KACHEL} ${sonderwunschMoeglich ? '' : '@[11rem]:col-span-2'}`}>
          {artikel.ausverkauft ? texte.wiederVerfuegbar : texte.ausverkauftMelden}
        </button>
      </div>
    </div>
  );
}
