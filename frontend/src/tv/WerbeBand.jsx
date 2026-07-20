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

  const bildBreite = breite / 3;

  const reihe = (praefix, versteckt) => (
    <div className="flex h-full" aria-hidden={versteckt || undefined}>
      {bilder.map((bild) => (
        <div key={`${praefix}-${bild.id}`} style={{ width: bildBreite, flex: 'none' }}
          className="flex h-full items-center justify-center p-2">
          <img src={bild.url} alt="Werbung"
            className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      ))}
    </div>
  );

  return (
    <div ref={rahmen} className="h-full flex-1 overflow-hidden">
      <div className="werbeband-scroll flex h-full"
        style={{ '--scroll-dauer': `${bilder.length * SEKUNDEN_JE_BILD}s` }}>
        {reihe('original', false)}
        {reihe('kopie', true)}
      </div>
    </div>
  );
}
