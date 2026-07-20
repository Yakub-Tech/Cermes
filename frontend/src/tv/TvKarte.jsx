import { lesbareSchriftfarbe } from '../komponenten/farbe.js';

export default function TvKarte({ kaertchen }) {
  const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);
  return (
    <div className="relative rounded-3xl px-3 py-4 pt-6 shadow-xl"
      style={{ backgroundColor: kaertchen.artikel_farbe, color: schrift }}>
      <span className="stanzung absolute left-1/2 top-2 -translate-x-1/2" />
      <p className="nummer text-center text-5xl leading-none">{kaertchen.nummer}</p>
      <p className="mt-1 pr-1 text-right text-sm font-semibold opacity-90">
        {kaertchen.artikel_name}
      </p>
    </div>
  );
}
