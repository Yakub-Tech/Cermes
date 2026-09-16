import { formatEuro } from '../api.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

export default function ArtikelKarte({ artikel, sprache }) {
  const hatBild = !!artikel.bild_url;

  return (
    <div
      className="kaertchen-schatten-vertieft relative flex min-h-40 flex-col items-center justify-center overflow-hidden rounded-[24px] border border-linie bg-flaeche bg-cover bg-center p-4 text-center"
      style={{ backgroundImage: hatBild ? `url(${artikel.bild_url})` : undefined }}
    >
      {hatBild && <div className="absolute inset-0 bg-schrift/45" />}
      <div className="relative">
        <p className={`break-words text-2xl font-bold ${hatBild ? 'text-flaeche drop-shadow-md' : 'text-schrift'}`}>
          {zweisprachigerName(artikel.name, artikel.name_tr, sprache)}
        </p>
        <p className={`nummer mt-2 text-xl ${hatBild ? 'text-flaeche/90 drop-shadow-md' : 'text-navy'}`}>
          {formatEuro(artikel.preis_cent)}
        </p>
      </div>
    </div>
  );
}
