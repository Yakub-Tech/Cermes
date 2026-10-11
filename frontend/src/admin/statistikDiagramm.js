import { formatEuro } from '../api.js';
import { achsenFarbe, gitterFarbe } from './statistikFarben.js';
import { textUmbrechen, skalaBauen, inTeileZerlegen } from './statistikDiagrammMasse.js';

const BREITE = 640;
const PIXELDICHTE = 2;
const SCHRIFT = '"Roboto", ui-sans-serif, system-ui, sans-serif';
const TEXTFARBE = '#16202b';
const STREIFENFARBE = '#f4f7fb';
const RAND = 12;
const ZEILE_EINFACH = 26;
const ZEILE_ZWEI = 38;
const LEGENDE_HOEHE = 28;
const SAEULEN_HOEHE = 300;

function werteText(wert, format) {
  return format === 'euro' ? formatEuro(wert) : wert.toLocaleString('de-DE');
}

function leinwandBauen(breite, hoehe) {
  const leinwand = document.createElement('canvas');
  leinwand.width = breite * PIXELDICHTE;
  leinwand.height = hoehe * PIXELDICHTE;
  const stift = leinwand.getContext('2d');
  stift.scale(PIXELDICHTE, PIXELDICHTE);
  stift.fillStyle = '#ffffff';
  stift.fillRect(0, 0, breite, hoehe);
  return { leinwand, stift };
}

function bildErgebnis(leinwand, breite, hoehe) {
  return { dataUrl: leinwand.toDataURL('image/png'), breite, hoehe };
}

function schriftSetzen(stift, groesse, fett = false) {
  stift.font = `${fett ? 'bold ' : ''}${groesse}px ${SCHRIFT}`;
}

function legendeZeichnen(stift, legende) {
  schriftSetzen(stift, 11);
  stift.textBaseline = 'middle';
  stift.textAlign = 'left';
  let x = RAND;
  for (const eintrag of legende) {
    stift.fillStyle = eintrag.farbe;
    stift.beginPath();
    stift.arc(x + 5, LEGENDE_HOEHE / 2, 5, 0, Math.PI * 2);
    stift.fill();
    stift.fillStyle = achsenFarbe;
    stift.fillText(eintrag.text, x + 15, LEGENDE_HOEHE / 2);
    x += 15 + stift.measureText(eintrag.text).width + 18;
  }
}

function balkenZeichnen(stift, x, y, breite, hoehe, farbe) {
  stift.fillStyle = farbe;
  stift.beginPath();
  stift.roundRect(x, y, Math.max(breite, 1), hoehe, 3);
  stift.fill();
}

function artikelTeilZeichnen(grafik, teil, position, skala) {
  const messbar = leinwandBauen(1, 1).stift;
  schriftSetzen(messbar, 12);
  const messen = (text) => messbar.measureText(text).width;

  let namensBreite = 0;
  for (const zeile of grafik.daten) namensBreite = Math.max(namensBreite, Math.min(210, messen(zeile.beschriftung)));
  namensBreite = Math.max(80, Math.ceil(namensBreite));
  let wertBreite = 0;
  for (const zeile of grafik.daten) wertBreite = Math.max(wertBreite, messen(werteText(zeile.wert, grafik.format)));
  wertBreite = Math.ceil(wertBreite) + 10;

  const balkenLinks = RAND + namensBreite + 12;
  const balkenBreite = BREITE - RAND - wertBreite - balkenLinks;
  const nullLinie = balkenLinks + ((0 - skala.min) / (skala.max - skala.min)) * balkenBreite;

  const zeilen = teil.map((eintrag) => ({
    eintrag, namen: textUmbrechen(eintrag.beschriftung, namensBreite, messen, 2),
  }));
  const legende = grafik.legende ? LEGENDE_HOEHE : 0;
  const randOben = legende > 0 || position.erster ? RAND / 2 : 0;
  const randUnten = position.letzter ? RAND / 2 : 0;
  const hoehe = legende + randOben + zeilen.reduce((summe, z) => summe + (z.namen.length > 1 ? ZEILE_ZWEI : ZEILE_EINFACH), 0) + randUnten;

  const { leinwand, stift } = leinwandBauen(BREITE, hoehe);
  if (legende) legendeZeichnen(stift, grafik.legende);
  stift.textBaseline = 'middle';
  let y = legende + randOben;
  zeilen.forEach((zeile, index) => {
    const zeilenHoehe = zeile.namen.length > 1 ? ZEILE_ZWEI : ZEILE_EINFACH;
    const mitte = y + zeilenHoehe / 2;
    if ((position.start + index) % 2 === 1) {
      stift.fillStyle = STREIFENFARBE;
      stift.fillRect(0, y, BREITE, zeilenHoehe);
    }
    schriftSetzen(stift, 12);
    stift.fillStyle = TEXTFARBE;
    stift.textAlign = 'left';
    const textHoehe = 14;
    zeile.namen.forEach((namenZeile, nr) => {
      stift.fillText(namenZeile, RAND, mitte + (nr - (zeile.namen.length - 1) / 2) * textHoehe);
    });

    const wert = zeile.eintrag.wert;
    const laenge = (Math.abs(wert) / (skala.max - skala.min)) * balkenBreite;
    const links = wert >= 0 ? nullLinie : nullLinie - laenge;
    if (wert !== 0) balkenZeichnen(stift, links, mitte - 7, laenge, 14, zeile.eintrag.farbe);
    schriftSetzen(stift, 12, true);
    stift.fillStyle = TEXTFARBE;
    stift.fillText(werteText(wert, grafik.format), (wert >= 0 ? nullLinie + laenge : nullLinie) + 6, mitte);
    y += zeilenHoehe;
  });
  return bildErgebnis(leinwand, BREITE, hoehe);
}

function saeulenZeichnen(grafik) {
  const messbar = leinwandBauen(1, 1).stift;
  schriftSetzen(messbar, 11);
  const messen = (text) => messbar.measureText(text).width;

  const skala = skalaBauen(0, Math.max(...grafik.daten.map((d) => d.wert)));
  let achsenBreite = 0;
  for (const schritt of skala.schritte) achsenBreite = Math.max(achsenBreite, messen(werteText(schritt, grafik.format)));
  const links = RAND + Math.ceil(achsenBreite) + 8;
  const plotBreite = BREITE - links - RAND;
  const platz = plotBreite / grafik.daten.length;

  let breitesterName = 0;
  for (const eintrag of grafik.daten) breitesterName = Math.max(breitesterName, messen(eintrag.beschriftung));
  const schraeg = breitesterName + 6 > platz;
  const jedeNte = schraeg ? Math.max(1, Math.ceil(14 / platz)) : 1;
  const unterRand = schraeg ? Math.ceil(breitesterName * 0.64) + 18 : 28;

  const oben = 22;
  const plotHoehe = SAEULEN_HOEHE - oben - unterRand;
  const { leinwand, stift } = leinwandBauen(BREITE, SAEULEN_HOEHE);
  const hoeheFuer = (wert) => oben + plotHoehe - ((wert - skala.min) / (skala.max - skala.min)) * plotHoehe;

  schriftSetzen(stift, 11);
  stift.textBaseline = 'middle';
  stift.textAlign = 'right';
  for (const schritt of skala.schritte) {
    stift.strokeStyle = gitterFarbe;
    stift.lineWidth = 1;
    stift.beginPath();
    stift.moveTo(links, hoeheFuer(schritt));
    stift.lineTo(BREITE - RAND, hoeheFuer(schritt));
    stift.stroke();
    stift.fillStyle = achsenFarbe;
    stift.fillText(werteText(schritt, grafik.format), links - 8, hoeheFuer(schritt));
  }

  const saeulenBreite = Math.min(32, platz * 0.7);
  grafik.daten.forEach((eintrag, index) => {
    const mitte = links + platz * index + platz / 2;
    const spitze = hoeheFuer(eintrag.wert);
    if (eintrag.wert > 0) balkenZeichnen(stift, mitte - saeulenBreite / 2, spitze, saeulenBreite, hoeheFuer(0) - spitze, eintrag.farbe);
    if (eintrag.wert > 0 && platz >= 26) {
      stift.fillStyle = TEXTFARBE;
      stift.textAlign = 'center';
      stift.textBaseline = 'alphabetic';
      stift.fillText(werteText(eintrag.wert, grafik.format), mitte, spitze - 4);
    }
    if (index % jedeNte !== 0) return;
    stift.fillStyle = achsenFarbe;
    stift.textBaseline = 'top';
    if (schraeg) {
      stift.save();
      stift.translate(mitte + 3, hoeheFuer(0) + 6);
      stift.rotate((-40 * Math.PI) / 180);
      stift.textAlign = 'right';
      stift.fillText(eintrag.beschriftung, 0, 0);
      stift.restore();
    } else {
      stift.textAlign = 'center';
      stift.fillText(eintrag.beschriftung, mitte, hoeheFuer(0) + 8);
    }
  });
  return bildErgebnis(leinwand, BREITE, SAEULEN_HOEHE);
}

export function diagrammBilder(grafik, maxZeilen) {
  if (grafik.id === 'grafikVerlauf') return [saeulenZeichnen(grafik)];
  const werte = grafik.daten.map((d) => d.wert);
  const skala = {
    min: Math.min(0, ...werte),
    max: Math.max(1, ...werte),
  };
  const teile = inTeileZerlegen(grafik.daten, maxZeilen);
  let start = 0;
  return teile.map((teil, index) => {
    const position = { erster: index === 0, letzter: index === teile.length - 1, start };
    start += teil.length;
    return artikelTeilZeichnen(grafik, teil, position, skala);
  });
}
