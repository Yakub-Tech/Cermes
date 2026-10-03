import { dunklereFarbe, lesbareSchriftfarbe } from '../komponenten/farbe.js';
import { schriftgroesseFuerArtikelname } from '../komponenten/schriftgroesse.js';

export default function TvKarte({ kaertchen, neu }) {
  const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);
  const artikelSchriftgroesse = schriftgroesseFuerArtikelname(kaertchen.artikel_name);
  return (
    <div className={`putz-textur ${neu ? 'neu-leuchten' : ''} kaertchen-schatten flex aspect-[2/1] flex-col justify-between rounded-[18px] border px-3 py-2`}
      style={{
        backgroundColor: kaertchen.artikel_farbe,
        borderColor: dunklereFarbe(kaertchen.artikel_farbe),
        color: schrift,
      }}>
      <p className="nummer relative text-center text-5xl leading-none"
        style={{ fontFamily: 'Arial, sans-serif' }}>
        {kaertchen.nummer}
      </p>
      <p className={`relative truncate border-t border-current/30 pt-0.5 text-right font-medium ${artikelSchriftgroesse}`}>
        {kaertchen.artikel_name}
      </p>
    </div>
  );
}
