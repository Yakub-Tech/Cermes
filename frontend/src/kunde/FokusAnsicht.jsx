import { formatEuro } from '../api.js';

export default function FokusAnsicht({ fokus }) {
  const hatBild = !!fokus.bild_url;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-8">
      <div
        className="kaertchen-schatten-vertieft relative flex w-full max-w-4xl flex-col items-center overflow-hidden rounded-[32px] border border-linie bg-flaeche bg-cover bg-center p-10 text-center"
        style={{ backgroundImage: hatBild ? `url(${fokus.bild_url})` : undefined }}
      >
        {hatBild && <div className="absolute inset-0 bg-schrift/50" />}
        <div className="relative w-full">
          <p className={`break-words text-5xl font-bold ${hatBild ? 'text-flaeche drop-shadow-md' : 'text-schrift'}`}>
            {fokus.artikel_name}
          </p>
          <p className={`nummer mt-3 text-3xl ${hatBild ? 'text-flaeche/90 drop-shadow-md' : 'text-schrift-gedimmt'}`}>
            {formatEuro(fokus.preis_cent)}
          </p>

          {fokus.beilagenOptionen.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fokus.beilagenOptionen.map((beilage) => (
                <div key={beilage.name}
                  className={`rounded-full border px-4 py-3 text-lg font-semibold ${
                    !beilage.aktiv
                      ? 'border-linie text-schrift-gedimmt opacity-40'
                      : beilage.ausgewaehlt
                        ? 'border-navy bg-navy text-grund'
                        : hatBild
                          ? 'border-flaeche/60 bg-flaeche/20 text-flaeche'
                          : 'border-linie bg-grund text-schrift'
                  }`}>
                  {beilage.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
