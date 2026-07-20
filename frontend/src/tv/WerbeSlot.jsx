import { useEffect, useState } from 'react';

export default function WerbeSlot({ bilder, startIndex, startVerzoegerungMs = 0 }) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (bilder.length < 2) return;
    let intervall;
    const verzoegerung = setTimeout(() => {
      intervall = setInterval(() => setIndex((i) => (i + 1) % bilder.length), 6000);
    }, startVerzoegerungMs);
    return () => {
      clearTimeout(verzoegerung);
      clearInterval(intervall);
    };
  }, [bilder.length, startVerzoegerungMs]);

  const bild = bilder[index % bilder.length];
  return (
    <div className="flex flex-1 items-center justify-center p-2">
      <img key={bild.id} src={bild.url} alt="Werbung"
        className="einblenden max-h-full max-w-full rounded-xl object-contain" />
    </div>
  );
}
