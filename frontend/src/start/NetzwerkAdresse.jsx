import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { HelpCircle, Wifi } from 'lucide-react';
import { apiGet } from '../api.js';
import { Button } from '@/komponenten/ui/button';
import NetzwerkHilfeDialog from './NetzwerkHilfeDialog.jsx';
import { de, tr } from '../sprache/netzwerkAdresse.js';

export default function NetzwerkAdresse({ sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  const [adresse, setAdresse] = useState(null);
  const [geladen, setGeladen] = useState(false);
  const [qrCodeBild, setQrCodeBild] = useState(null);
  const [zeigeHilfe, setZeigeHilfe] = useState(false);

  useEffect(() => {
    apiGet('/api/netzwerkadresse')
      .then((daten) => setAdresse(daten.adresse))
      .catch(() => setAdresse(null))
      .finally(() => setGeladen(true));
  }, []);

  useEffect(() => {
    if (!adresse) {
      setQrCodeBild(null);
      return;
    }
    let aktiv = true;
    QRCode.toDataURL(`http://${adresse}`).then((bild) => {
      if (aktiv) setQrCodeBild(bild);
    });
    return () => { aktiv = false; };
  }, [adresse]);

  if (!geladen) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-linie bg-flaeche p-4 shadow-[0_1px_2px_var(--schattenfarbe)]">
        {qrCodeBild && (
          <img src={qrCodeBild} alt={texte.qrCodeAlt} className="h-20 w-20 rounded-md" />
        )}
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 shrink-0 text-schrift-gedimmt" strokeWidth={1.5} />
          <span className="text-sm text-schrift-gedimmt">
            {adresse
              ? <>{texte.erreichbarUnter} <span className="font-medium text-schrift">{adresse}</span></>
              : texte.nichtGefunden}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setZeigeHilfe(true)}
          aria-label={texte.hilfeAriaLabel} className="cursor-pointer text-schrift-gedimmt">
          <HelpCircle className="size-5" strokeWidth={1.5} />
        </Button>
      </div>
      {zeigeHilfe && (
        <NetzwerkHilfeDialog adresse={adresse} sprache={sprache} onSchliessen={() => setZeigeHilfe(false)} />
      )}
    </>
  );
}
