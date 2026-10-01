import { exportModellBauen, modellAuswaehlen } from './statistikExportModell.js';
import { diagrammBilder } from './statistikDiagramm.js';
import { logoAlsPng } from './statistikLogo.js';
import { excelErstellen } from './statistikExcel.js';
import { pdfErstellen } from './statistikPdf.js';
import { de as exportDe, tr as exportTr } from '../sprache/statistikExport.js';

function erstelltTextBauen(sprache) {
  const texte = sprache === 'tr' ? exportTr : exportDe;
  const jetzt = new Date();
  const datum = jetzt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const uhrzeit = jetzt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${texte.erstelltAm}${datum}, ${uhrzeit}`;
}

const MAX_ARTIKEL_PRO_BILD_PDF = 12;

export async function statistikExportieren(art, eingabe, auswahl) {
  const gewaehlt = modellAuswaehlen(exportModellBauen(eingabe), auswahl);
  const maxZeilen = art === 'excel' ? Infinity : MAX_ARTIKEL_PRO_BILD_PDF;
  const modell = {
    ...gewaehlt,
    bloecke: gewaehlt.bloecke.map((block) => (
      block.grafik ? { ...block, bilder: diagrammBilder(block.grafik, maxZeilen) } : block
    )),
  };
  const logo = await logoAlsPng();
  const erstelltText = erstelltTextBauen(eingabe.sprache);
  if (art === 'excel') {
    await excelErstellen(eingabe, modell, logo, erstelltText);
  } else {
    await pdfErstellen(eingabe, modell, logo, erstelltText);
  }
}
