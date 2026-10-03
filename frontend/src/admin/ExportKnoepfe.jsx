import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/komponenten/ui/button';
import ExportAuswahlDialog from './ExportAuswahlDialog.jsx';
import { statistikExportieren } from './statistikExport.js';
import { de, tr } from '../sprache/statistikExport.js';

export default function ExportKnoepfe({ eingabe, sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState(false);
  const [dialogArt, setDialogArt] = useState(null);

  async function exportieren(art, auswahl) {
    setDialogArt(null);
    setLaeuft(true);
    setFehler(false);
    try {
      await statistikExportieren(art, eingabe, auswahl);
    } catch {
      setFehler(true);
    } finally {
      setLaeuft(false);
    }
  }

  const knopfKlasse = 'gap-1 px-2 text-xs text-schrift-gedimmt disabled:cursor-wait';
  return (
    <div className="ml-auto flex items-center gap-1.5">
      {fehler && <span className="text-xs text-gefahr-schrift">{texte.exportFehler}</span>}
      <Button type="button" variant="outline" size="sm" disabled={laeuft} onClick={() => setDialogArt('excel')} className={knopfKlasse}>
        <FileSpreadsheet size={14} />{texte.excelKnopf}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={laeuft} onClick={() => setDialogArt('pdf')} className={knopfKlasse}>
        <FileText size={14} />{texte.pdfKnopf}
      </Button>
      {dialogArt && (
        <ExportAuswahlDialog art={dialogArt} eingabe={eingabe} sprache={sprache}
          onHerunterladen={(auswahl) => exportieren(dialogArt, auswahl)} onSchliessen={() => setDialogArt(null)} />
      )}
    </div>
  );
}
