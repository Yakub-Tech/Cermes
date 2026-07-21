import { lesbareSchriftfarbe } from '../komponenten/farbe.js';

export default function TvKarte({ kaertchen }) {
  const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);
  const randLinie = schrift === '#ffffff' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
  return (
    <div className="rounded-3xl px-3 py-4 shadow-sm"
      style={{ backgroundColor: kaertchen.artikel_farbe + 'e6', color: schrift }}>
      <p className="nummer text-center text-5xl leading-none">{kaertchen.nummer}</p>
      <p className="mt-3 border-t pr-1 pt-1 text-right text-xs font-light italic opacity-90"
        style={{ borderColor: randLinie }}>
        {kaertchen.artikel_name}
      </p>
    </div>
  );
}
