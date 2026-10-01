import { exportDateiname } from './statistikExportModell.js';
import { dateiHerunterladen } from './dateiHerunterladen.js';

const MARINE = 'FF10538F';
const ZEBRA = 'FFEEF3F8';
const RAND = 'FFCCD8E4';
const EURO_FORMAT = '#,##0.00 "€"';
const FORMATE = { zahl: '#,##0', euro: EURO_FORMAT, nummer: '0', text: '@' };

function rahmen() {
  const linie = { style: 'thin', color: { argb: RAND } };
  return { top: linie, bottom: linie, left: linie, right: linie };
}

function zelleSchreiben(zelle, wert, art) {
  if (art === 'euro') zelle.value = wert / 100;
  else zelle.value = wert;
  zelle.numFmt = FORMATE[art];
  zelle.alignment = { horizontal: art === 'text' ? 'left' : 'right', vertical: 'middle' };
}

function kopfBlock(blatt, modell, erstelltText) {
  blatt.getCell('A1').value = modell.titel;
  blatt.getCell('A1').font = { name: 'Calibri', size: 18, bold: true, color: { argb: MARINE } };
  blatt.getRow(1).height = 28;
  const zeilen = [...modell.untertitel.split('\n'), erstelltText];
  zeilen.forEach((text, index) => {
    const zelle = blatt.getCell(2 + index, 1);
    zelle.value = text;
    zelle.font = { name: 'Calibri', size: 11, color: { argb: 'FF5A6B7D' } };
  });
  return 2 + zeilen.length + 1;
}

function spaltenBreiten(blatt, spaltenTitel, zeilen) {
  spaltenTitel.forEach((titel, nummer) => {
    let laenge = String(titel).length;
    for (const zeile of zeilen) {
      laenge = Math.max(laenge, String(zeile[nummer] ?? '').length + 2);
    }
    blatt.getColumn(nummer + 1).width = Math.min(Math.max(laenge + 3, 14), 50);
  });
}

function kopfzeileSchreiben(blatt, zeilenNummer, titel, arten) {
  titel.forEach((text, index) => {
    const zelle = blatt.getCell(zeilenNummer, index + 1);
    zelle.value = text;
    zelle.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    zelle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MARINE } };
    zelle.alignment = { horizontal: arten[index] === 'text' ? 'left' : 'right', vertical: 'middle' };
    zelle.border = rahmen();
  });
  blatt.getRow(zeilenNummer).height = 22;
  blatt.views = [{ state: 'frozen', ySplit: zeilenNummer }];
}

function seiteEinrichten(blatt) {
  blatt.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

async function uebersichtBauen(arbeitsmappe, modell, erstelltText, logo) {
  const blatt = arbeitsmappe.addWorksheet(modell.uebersichtName);
  const tabellenStart = kopfBlock(blatt, modell, erstelltText);
  const arten = ['text', 'text'];
  kopfzeileSchreiben(blatt, tabellenStart, modell.kennzahlSpalten, arten);

  modell.kennzahlen.forEach((kennzahl, index) => {
    const zeilenNummer = tabellenStart + 1 + index;
    const beschriftung = blatt.getCell(zeilenNummer, 1);
    beschriftung.value = kennzahl.beschriftung;
    beschriftung.border = rahmen();
    const wertZelle = blatt.getCell(zeilenNummer, 2);
    zelleSchreiben(wertZelle, kennzahl.roh, kennzahl.art);
    wertZelle.font = { bold: true };
    wertZelle.border = rahmen();
    if (index % 2 === 1) {
      for (const zelle of [beschriftung, wertZelle]) {
        zelle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      }
    }
  });
  if (modell.hinweisOhneKosten) {
    const hinweis = blatt.getCell(tabellenStart + modell.kennzahlen.length + 2, 1);
    hinweis.value = modell.texte.stueckOhneKosten.trim();
    hinweis.font = { italic: true, color: { argb: 'FF8B1E2D' } };
  }
  blatt.getColumn(1).width = 34;
  blatt.getColumn(2).width = 24;

  if (logo) {
    const bildId = arbeitsmappe.addImage({ base64: logo.dataUrl, extension: 'png' });
    blatt.addImage(bildId, { tl: { col: 2.2, row: 0.3 }, ext: { width: 64, height: 64 } });
    blatt.getColumn(3).width = 12;
  }
  seiteEinrichten(blatt);
}

function abschnittBauen(arbeitsmappe, modell, abschnitt, erstelltText) {
  const blatt = arbeitsmappe.addWorksheet(abschnitt.blattName);
  const tabellenStart = kopfBlock(blatt, modell, erstelltText) + 1;
  blatt.getCell(tabellenStart - 1, 1).value = abschnitt.titel;
  blatt.getCell(tabellenStart - 1, 1).font = { size: 13, bold: true, color: { argb: MARINE } };

  const titel = abschnitt.spalten.map((s) => s.titel);
  const arten = abschnitt.spalten.map((s) => s.art);
  kopfzeileSchreiben(blatt, tabellenStart, titel, arten);

  abschnitt.zeilen.forEach((zeile, index) => {
    zeile.forEach((wert, nummer) => {
      const zelle = blatt.getCell(tabellenStart + 1 + index, nummer + 1);
      zelleSchreiben(zelle, wert, arten[nummer]);
      zelle.border = rahmen();
      if (index % 2 === 1) zelle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
    });
  });

  if (abschnitt.zeilen.length === 0) {
    blatt.getCell(tabellenStart + 1, 1).value = modell.texte.keineEintraege;
    blatt.getCell(tabellenStart + 1, 1).font = { italic: true, color: { argb: 'FF5A6B7D' } };
  }

  if (abschnitt.summe) {
    const summenZeile = tabellenStart + 1 + abschnitt.zeilen.length;
    abschnitt.summe.forEach((wert, nummer) => {
      const zelle = blatt.getCell(summenZeile, nummer + 1);
      if (wert === '') {
        zelle.value = null;
      } else if (nummer === 0) {
        zelle.value = wert;
      } else {
        zelleSchreiben(zelle, wert, arten[nummer]);
      }
      zelle.font = { bold: true };
      zelle.border = { ...rahmen(), top: { style: 'medium', color: { argb: MARINE } } };
    });
  }

  spaltenBreiten(blatt, titel, abschnitt.zeilen);
  seiteEinrichten(blatt);
}

export async function excelErstellen(eingabe, modell, logo, erstelltText) {
  const ExcelJS = (await import('exceljs')).default;
  const arbeitsmappe = new ExcelJS.Workbook();
  arbeitsmappe.creator = modell.titel;
  arbeitsmappe.created = new Date();

  await uebersichtBauen(arbeitsmappe, modell, erstelltText, logo);
  for (const abschnitt of modell.abschnitte) {
    abschnittBauen(arbeitsmappe, modell, abschnitt, erstelltText);
  }

  const puffer = await arbeitsmappe.xlsx.writeBuffer();
  dateiHerunterladen(
    new Blob([puffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    exportDateiname(eingabe, 'xlsx'),
  );
}
