import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
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

  const knopfKlasse = 'kaertchen-schatten flex cursor-pointer items-center gap-1 rounded-full border border-linie px-2 py-1 text-xs text-schrift-gedimmt hover:bg-flaeche-hell disabled:cursor-wait disabled:opacity-60';
  return (
    <div className="ml-auto flex items-center gap-1.5">
      {fehler && <span className="text-xs text-weinrot">{texte.exportFehler}</span>}
      <button type="button" disabled={laeuft} onClick={() => setDialogArt('excel')} className={knopfKlasse}>
        <FileSpreadsheet size={14} />{texte.excelKnopf}
      </button>
      <button type="button" disabled={laeuft} onClick={() => setDialogArt('pdf')} className={knopfKlasse}>
        <FileText size={14} />{texte.pdfKnopf}
      </button>
      {dialogArt && (
        <ExportAuswahlDialog art={dialogArt} eingabe={eingabe} sprache={sprache}
          onHerunterladen={(auswahl) => exportieren(dialogArt, auswahl)} onSchliessen={() => setDialogArt(null)} />
      )}
    </div>
  );
}
