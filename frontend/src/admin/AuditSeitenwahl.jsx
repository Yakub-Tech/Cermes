import { Button } from '@/komponenten/ui/button';

export default function AuditSeitenwahl({ seite, seiten, gesamt, onSeiteWaehlen, texte }) {
  return (
    <div className="mt-4 flex items-center gap-2.5 text-sm text-schrift-gedimmt">
      <Button variant="outline" size="sm" onClick={() => onSeiteWaehlen(seite - 1)} disabled={seite <= 1}
        className="px-2.5 text-sm">
        {texte.vorherigeSeite}
      </Button>
      <span>{texte.seiteVon.replace('{seite}', seite).replace('{seiten}', seiten)}</span>
      <Button variant="outline" size="sm" onClick={() => onSeiteWaehlen(seite + 1)} disabled={seite >= seiten}
        className="px-2.5 text-sm">
        {texte.naechsteSeite}
      </Button>
      <span>{gesamt} {gesamt === 1 ? texte.gesamtSuffixEinzahl : texte.gesamtSuffix}</span>
    </div>
  );
}
