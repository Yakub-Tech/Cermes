import { useEffect, useState } from 'react';
import logo from '../design/logo.png';

export default function WerbeKarussell({ bilder }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (bilder.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % bilder.length), 6000);
    return () => clearInterval(timer);
  }, [bilder.length]);

  if (bilder.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <img src={logo} alt="Vereinslogo" className="w-2/3 opacity-80" />
      </div>
    );
  }

  const bild = bilder[index % bilder.length];
  return (
    <div className="flex h-full items-center justify-center p-4">
      <img key={bild.id} src={bild.url} alt="Werbung"
        className="einblenden max-h-full max-w-full rounded-xl object-contain" />
    </div>
  );
}
