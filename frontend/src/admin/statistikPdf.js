import { formatEuro } from '../api.js';
import { exportDateiname } from './statistikExportModell.js';
import { dateiHerunterladen } from './dateiHerunterladen.js';

const MARINE = '#10538F';
const ZEBRA = '#EEF3F8';
const LINIE = '#CCD8E4';
const GRAU = '#5A6B7D';

function zahlFormatieren(wert) {
  return wert.toLocaleString('de-DE');
}

function zelleText(wert, art) {
  if (art === 'euro') return formatEuro(wert);
  if (art === 'zahl') return zahlFormatieren(wert);
  return String(wert);
}

function tabelleBauen(spalten, zeilen, summe) {
  const kopf = spalten.map((s) => ({
    text: s.titel, bold: true, color: '#FFFFFF', fillColor: MARINE,
    alignment: s.art === 'text' ? 'left' : 'right', margin: [4, 4, 4, 4],
  }));
  const koerper = zeilen.map((zeile, index) => zeile.map((wert, nummer) => ({
    text: zelleText(wert, spalten[nummer].art),
    alignment: spalten[nummer].art === 'text' ? 'left' : 'right',
    fillColor: index % 2 === 1 ? ZEBRA : null,
    margin: [4, 3, 4, 3],
  })));
  const summenZeile = summe ? [summe.map((wert, nummer) => ({
    text: wert === '' ? '' : zelleText(wert, nummer === 0 ? 'text' : spalten[nummer].art),
    bold: true, alignment: spalten[nummer].art === 'text' ? 'left' : 'right', margin: [4, 4, 4, 4],
  }))] : [];

  const breiten = spalten.map((s) => (s.art === 'text' ? '*' : 'auto'));
  if (!breiten.includes('*')) breiten[0] = '*';

  return {
    table: { headerRows: 1, dontBreakRows: true, widths: breiten, body: [kopf, ...koerper, ...summenZeile] },
    layout: {
      hLineWidth: (i, knoten) => (i === knoten.table.body.length - 1 && summe ? 1.5 : 0.5),
      hLineColor: (i, knoten) => (i === knoten.table.body.length - 1 && summe ? MARINE : LINIE),
      vLineWidth: () => 0,
    },
  };
}

function kennzahlKacheln(kennzahlen) {
  const zellen = kennzahlen.map((k) => ({
    stack: [
      { text: k.beschriftung, fontSize: 8, color: GRAU },
      { text: k.art === 'euro' ? formatEuro(k.roh) : String(k.wert), fontSize: 14, bold: true, color: MARINE, margin: [0, 3, 0, 0] },
    ],
    margin: [6, 6, 6, 6],
  }));
  return {
    table: { widths: kennzahlen.map(() => '*'), body: [zellen] },
    layout: { hLineColor: () => LINIE, vLineColor: () => LINIE, hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
  };
}

function seitenumbruchVorUeberschrift(knoten, abfrage) {
  if (!knoten.headlineLevel) return false;
  const tabelle = abfrage.getFollowingNodesOnPage().find((k) => k.table);
  if (!tabelle) return true;
  const stehtObenAufSeite = knoten.startPosition.verticalRatio < 0.05;
  if (knoten.headlineLevel === 1 && tabelle.pageNumbers.length > 1 && !stehtObenAufSeite) return true;
  return false;
}

function dokumentBauen(modell, logo, erstelltText) {
  const kopf = {
    columns: [
      ...(logo ? [{ image: logo.dataUrl, width: 44, height: 44 }] : []),
      {
        stack: [
          { text: modell.titel, fontSize: 20, bold: true, color: MARINE },
          ...modell.untertitel.split('\n').map((zeile) => ({ text: zeile, fontSize: 10, color: GRAU, margin: [0, 2, 0, 0] })),
        ],
        margin: [logo ? 12 : 0, 0, 0, 0],
      },
    ],
    margin: [0, 0, 0, 14],
  };

  const inhalt = [kopf, kennzahlKacheln(modell.kennzahlen)];
  if (modell.hinweisOhneKosten) {
    inhalt.push({ text: modell.texte.stueckOhneKosten.trim(), italics: true, fontSize: 9, color: '#8B1E2D', margin: [0, 6, 0, 0] });
  }

  for (const abschnitt of modell.abschnitte) {
    const ueberschrift = { text: abschnitt.titel, fontSize: 13, bold: true, color: MARINE, margin: [0, 18, 0, 6] };
    if (abschnitt.zeilen.length === 0) {
      inhalt.push({ stack: [ueberschrift, { text: modell.texte.keineEintraege, italics: true, color: GRAU }], unbreakable: true });
    } else {
      const stufe = abschnitt.zeilen.length <= 25 ? 1 : 2;
      inhalt.push({ ...ueberschrift, headlineLevel: stufe }, tabelleBauen(abschnitt.spalten, abschnitt.zeilen, abschnitt.summe));
    }
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content: inhalt,
    pageBreakBefore: seitenumbruchVorUeberschrift,
    footer: (seite, seitenAnzahl) => ({
      columns: [
        { text: erstelltText, fontSize: 8, color: GRAU },
        { text: `${modell.texte.seite} ${seite} ${modell.texte.von} ${seitenAnzahl}`, fontSize: 8, color: GRAU, alignment: 'right' },
      ],
      margin: [40, 18, 40, 0],
    }),
  };
}

export async function pdfErstellen(eingabe, modell, logo, erstelltText) {
  const pdfMake = (await import('pdfmake/build/pdfmake.min.js')).default;
  const schriften = (await import('pdfmake/build/vfs_fonts.js')).default;
  pdfMake.addVirtualFileSystem(schriften);

  const blob = await pdfMake.createPdf(dokumentBauen(modell, logo, erstelltText)).getBlob();
  dateiHerunterladen(blob, exportDateiname(eingabe, 'pdf'));
}
