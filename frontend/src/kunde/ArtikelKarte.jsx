import { formatEuro } from '../api.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de, tr } from '../sprache/kunde.js';

export default function ArtikelKarte({ artikel, sprache }) {
  const hatBild = !!artikel.bild_url;
  const ausverkauft = !!artikel.ausverkauft;
  const texte = sprache === 'tr' ? tr : de;

  return (
    <div className="relative flex min-h-40">
      <div
        className={`kaertchen-schatten-vertieft relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[24px] border border-linie bg-flaeche bg-cover bg-center p-4 text-center ${ausverkauft ? 'pb-14 opacity-50 grayscale' : ''}`}
        style={{ backgroundImage: hatBild ? `url(${artikel.bild_url})` : undefined }}
      >
        {hatBild && <div className="absolute inset-0 bg-black/50" />}
        <div className="relative">
          <p lang={sprache === 'tr' && artikel.name_tr ? 'tr' : 'de'}
            className={`hyphens-auto break-words text-2xl font-bold ${hatBild ? 'text-white drop-shadow-md' : 'text-schrift'}`}>
            {zweisprachigerName(artikel.name, artikel.name_tr, sprache)}
          </p>
          <p className={`nummer mt-2 text-xl ${hatBild ? 'text-white/90 drop-shadow-md' : 'text-schrift'}`}>
            {formatEuro(artikel.preis_cent)}
          </p>
        </div>
      </div>
      {ausverkauft && (
        <p className="pointer-events-none absolute inset-x-4 bottom-4 rounded-full bg-gefahr px-4 py-1 text-center text-lg font-bold text-white shadow-md ring-2 ring-white/70">
          {texte.ausverkauft}
        </p>
      )}
    </div>
  );
}
