import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { HelpCircle, Wifi } from 'lucide-react';
import { apiGet } from '../api.js';
import NetzwerkHilfeDialog from './NetzwerkHilfeDialog.jsx';

export default function NetzwerkAdresse() {
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
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-2xl border border-linie bg-flaeche p-4 shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
        {qrCodeBild && (
          <img src={qrCodeBild} alt="QR-Code zur Netzwerk-Adresse" className="h-20 w-20" />
        )}
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 shrink-0 text-schrift-gedimmt" strokeWidth={1.5} />
          <span className="text-sm text-schrift-gedimmt">
            {adresse ? `Erreichbar im Netzwerk unter: ${adresse}` : 'Adresse nicht automatisch gefunden'}
          </span>
        </div>
        <button
          onClick={() => setZeigeHilfe(true)}
          aria-label="Erklärung zur Netzwerk-Adresse anzeigen"
          className="cursor-pointer text-schrift-gedimmt hover:text-navy"
        >
          <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
      {zeigeHilfe && (
        <NetzwerkHilfeDialog adresse={adresse} onSchliessen={() => setZeigeHilfe(false)} />
      )}
    </>
  );
}
