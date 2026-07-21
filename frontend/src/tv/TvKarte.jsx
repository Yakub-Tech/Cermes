import { lesbareSchriftfarbe } from '../komponenten/farbe.js';
import { schriftgroesseFuerArtikelname } from '../komponenten/schriftgroesse.js';

export default function TvKarte({ kaertchen }) {
  const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);
  const randLinie = schrift === '#ffffff' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
  const artikelSchriftgroesse = schriftgroesseFuerArtikelname(kaertchen.artikel_name);
  return (
    <div className="flex aspect-[2/1] flex-col justify-between rounded-[18px] px-3 py-2 shadow-sm"
      style={{ backgroundColor: kaertchen.artikel_farbe + 'e6', color: schrift }}>
      <p className="nummer text-center text-5xl leading-none"
        style={{ fontFamily: 'Arial, sans-serif' }}>
        {kaertchen.nummer}
      </p>
      <p className={`truncate border-t pr-1 pt-0.5 text-right font-light italic opacity-90 ${artikelSchriftgroesse}`}
        style={{ borderColor: randLinie }}>
        {kaertchen.artikel_name}
      </p>
    </div>
  );
}
