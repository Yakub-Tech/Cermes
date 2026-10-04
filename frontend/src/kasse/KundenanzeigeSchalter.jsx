import { Monitor } from 'lucide-react';
import DesignSchalter from '../komponenten/DesignSchalter.jsx';
import { de as kopfzeileDe, tr as kopfzeileTr } from '../sprache/kopfzeile.js';

export default function KundenanzeigeSchalter({ design, onWahl, sprache, texte }) {
  const kopfzeileTexte = sprache === 'tr' ? kopfzeileTr : kopfzeileDe;
  const schalterTexte = { ...kopfzeileTexte, designWaehlen: texte.kundenanzeigeDarstellung };

  return (
    <div className="flex items-center gap-1.5" title={texte.kundenanzeigeDarstellung}>
      <Monitor className="h-4 w-4 text-schrift-gedimmt" aria-hidden="true" />
      <span className="whitespace-nowrap text-sm text-schrift-gedimmt">{texte.kundenanzeige}</span>
      <DesignSchalter design={design} onWahl={onWahl} texte={schalterTexte} />
    </div>
  );
}
