import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { statistikExportieren } from './statistikExport.js';
import { de, tr } from '../sprache/statistikExport.js';

export default function ExportKnoepfe({ eingabe, sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState(false);

  async function exportieren(art) {
    setLaeuft(true);
    setFehler(false);
    try {
      await statistikExportieren(art, eingabe);
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
      <button type="button" disabled={laeuft} onClick={() => exportieren('excel')} className={knopfKlasse}>
        <FileSpreadsheet size={14} />{texte.excelKnopf}
      </button>
      <button type="button" disabled={laeuft} onClick={() => exportieren('pdf')} className={knopfKlasse}>
        <FileText size={14} />{texte.pdfKnopf}
      </button>
    </div>
  );
}
