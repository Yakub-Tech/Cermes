import { useEffect, useRef, useState } from 'react';
import { lesbareSchriftfarbe } from '../komponenten/farbe.js';

function TvKarte({ kaertchen }) {
  const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);
  return (
    <div className="relative rounded-3xl px-4 py-6 pt-8 shadow-xl"
      style={{ backgroundColor: kaertchen.artikel_farbe, color: schrift }}>
      <span className="stanzung absolute left-1/2 top-3 -translate-x-1/2" />
      <p className="nummer text-center text-8xl leading-none">{kaertchen.nummer}</p>
      <p className="mt-1 pr-2 text-right text-2xl font-semibold opacity-90">
        {kaertchen.artikel_name}
      </p>
    </div>
  );
}

export default function EndlosSpalte({ titel, kaertchen }) {
  const rahmen = useRef(null);
  const inhalt = useRef(null);
  const [ueberlauf, setUeberlauf] = useState(false);

  useEffect(() => {
    if (rahmen.current && inhalt.current) {
      setUeberlauf(inhalt.current.scrollHeight > rahmen.current.clientHeight);
    }
  }, [kaertchen]);

  const liste = (
    <div ref={inhalt} className="space-y-4 p-4">
      {kaertchen.map((k) => <TvKarte key={`${k.nummer}-${k.artikel_name}`} kaertchen={k} />)}
    </div>
  );

  return (
    <section className="flex h-full min-h-0 flex-col">
      <h2 className="bg-blau py-4 text-center font-display text-4xl text-flaeche">{titel}</h2>
      <div ref={rahmen} className="flex-1 overflow-hidden">
        {ueberlauf ? (
          <div className="endlos-scroll"
            style={{ '--scroll-dauer': `${kaertchen.length * 3}s` }}>
            {liste}
            <div className="space-y-4 p-4" aria-hidden="true">
              {kaertchen.map((k) => (
                <TvKarte key={`kopie-${k.nummer}-${k.artikel_name}`} kaertchen={k} />
              ))}
            </div>
          </div>
        ) : liste}
      </div>
    </section>
  );
}
