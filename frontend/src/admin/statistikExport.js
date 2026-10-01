import { exportModellBauen } from './statistikExportModell.js';
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

export async function statistikExportieren(art, eingabe) {
  const modell = exportModellBauen(eingabe);
  const logo = await logoAlsPng();
  const erstelltText = erstelltTextBauen(eingabe.sprache);
  if (art === 'excel') {
    await excelErstellen(eingabe, modell, logo, erstelltText);
  } else {
    await pdfErstellen(eingabe, modell, logo, erstelltText);
  }
}
