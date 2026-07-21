import { useEffect, useRef, useState } from 'react';

const SEKUNDEN_JE_BILD = 4;

export default function WerbeBand({ bilder }) {
  const rahmen = useRef(null);
  const [breite, setBreite] = useState(0);

  useEffect(() => {
    if (!rahmen.current) return;
    const beobachter = new ResizeObserver((eintraege) => {
      setBreite(eintraege[0].contentRect.width);
    });
    beobachter.observe(rahmen.current);
    return () => beobachter.disconnect();
  }, []);

  const bildBreite = Math.floor(breite / 3);
  const doppelteListe = [...bilder, ...bilder];

  return (
    <div ref={rahmen} className="h-full min-w-0 flex-1 overflow-hidden">
      <div className="werbeband-scroll flex h-full w-max"
        style={{ '--scroll-dauer': `${bilder.length * SEKUNDEN_JE_BILD}s` }}>
        {doppelteListe.map((bild, index) => (
          <div key={`${index < bilder.length ? 'original' : 'kopie'}-${bild.id}`}
            aria-hidden={index < bilder.length ? undefined : 'true'}
            style={{ width: bildBreite }}
            className="flex h-full shrink-0 items-center justify-center p-2">
            <img src={bild.url} alt="Werbung"
              className="max-h-full max-w-full rounded-xl object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}
