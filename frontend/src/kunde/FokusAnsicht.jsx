import { formatEuro } from '../api.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

function beilageKlasse(beilage, hatBild) {
  if (!beilage.aktiv) {
    if (hatBild) return 'border-white/30 text-white/70 opacity-40';
    return 'border-linie text-schrift-gedimmt opacity-40';
  }
  if (beilage.ausgewaehlt) return 'border-erfolg bg-erfolg text-white';
  if (hatBild) return 'border-white/60 bg-white/20 text-white';
  return 'border-linie bg-flaeche-hell text-schrift';
}

export default function FokusAnsicht({ fokus, sprache }) {
  const hatBild = !!fokus.bild_url;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-8">
      <div
        className="kaertchen-schatten-vertieft relative flex w-full max-w-4xl flex-col items-center overflow-hidden rounded-[32px] border border-linie bg-flaeche bg-cover bg-center p-10 text-center"
        style={{ backgroundImage: hatBild ? `url(${fokus.bild_url})` : undefined }}
      >
        {hatBild && <div className="absolute inset-0 bg-black/50" />}
        <div className="relative w-full">
          <p className={`break-words text-5xl font-bold ${hatBild ? 'text-white drop-shadow-md' : 'text-schrift'}`}>
            {zweisprachigerName(fokus.artikel_name, fokus.artikel_name_tr, sprache)}
          </p>
          <p className={`nummer mt-3 text-3xl ${hatBild ? 'text-white/90 drop-shadow-md' : 'text-schrift-gedimmt'}`}>
            {formatEuro(fokus.preis_cent)}
          </p>

          {fokus.beilagenOptionen.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fokus.beilagenOptionen.map((beilage) => (
                <div key={beilage.name}
                  className={`rounded-full border px-4 py-3 text-lg font-semibold ${beilageKlasse(beilage, hatBild)}`}>
                  {zweisprachigerName(beilage.name, beilage.name_tr, sprache)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
