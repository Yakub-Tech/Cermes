import { datumAnzeigen } from './datum.js';
import { artikelSortieren } from './artikelSortierung.js';
import { kennzahlenBauen } from './statistikKennzahlen.js';
import { stueckFarbe, umsatzFarbe, gewinnFarbe, farbeOhneKosten } from './statistikFarben.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/statistikKomponenten.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';
import { de as sortierDe, tr as sortierTr } from '../sprache/artikelSortierung.js';
import { de as zeitraumDe, tr as zeitraumTr } from '../sprache/statistikZeitraum.js';
import { de as tagDe, tr as tagTr } from '../sprache/statistikEinzeltag.js';
import { de as exportDe, tr as exportTr } from '../sprache/statistikExport.js';

function grafikBauen(id, titel, daten, format, farbe, legende = null) {
  if (daten.length === 0) return null;
  return { id, titel, daten, format, farbe, legende };
}

function summeVon(zeilen, spaltenNummer) {
  return zeilen.reduce((summe, zeile) => summe + zeile[spaltenNummer], 0);
}

export function exportModellBauen(eingabe) {
  const { ansicht, von, bis, sprache, gesamt, stosszeit, artikel, sortierung, verlauf, stornos } = eingabe;
  const tuerkisch = sprache === 'tr';
  const texte = tuerkisch
    ? { ...gemeinsamTr, ...eigeneTr, ...zeitraumTr, ...tagTr, ...exportTr }
    : { ...gemeinsamDe, ...eigeneDe, ...zeitraumDe, ...tagDe, ...exportDe };
  const sortierTexte = tuerkisch ? sortierTr : sortierDe;
  const zeigtGeld = gesamt.umsatz_cent !== undefined;
  const mitDatum = ansicht === 'zeitraum';
  const uhr = texte.uhr ? ` ${texte.uhr}` : '';

  const untertitelZeilen = [
    mitDatum
      ? `${texte.zeitraumVorspann}${datumAnzeigen(von)}${texte.bis}${datumAnzeigen(bis)}`
      : `${texte.tagVorspann}${datumAnzeigen(von)}`,
    `${texte.sortierungVorspann}${sortierTexte[sortierung]}`,
  ];
  if (eingabe.verlaufArtikelName) {
    untertitelZeilen.push(`${texte.verlaufArtikelVorspann}${eingabe.verlaufArtikelName}`);
  }

  const abschnitte = [];
  const grafiken = {};

  const stueckZeilen = artikelSortieren(artikel, sortierung, 'stueck').map((a) => [a.artikel_name, a.stueck]);
  abschnitte.push({
    id: 'stueck', blattName: texte.blattStueck, titel: texte.titelStueckzahl,
    spalten: [
      { titel: texte.spalteArtikel, art: 'text' },
      { titel: texte.spalteStueck, art: 'zahl' },
    ],
    zeilen: stueckZeilen,
    summe: stueckZeilen.length > 0 ? [texte.summe, summeVon(stueckZeilen, 1)] : null,
  });
  grafiken.stueck = grafikBauen('grafikStueck', texte.grafikStueck,
    stueckZeilen.map((z) => ({ beschriftung: z[0], wert: z[1], farbe: stueckFarbe })), 'zahl', stueckFarbe);

  if (zeigtGeld) {
    const umsatzZeilen = artikelSortieren(artikel, sortierung, 'umsatz_cent').map((a) => [a.artikel_name, a.umsatz_cent]);
    abschnitte.push({
      id: 'umsatz', blattName: texte.blattUmsatz, titel: texte.titelUmsatz,
      spalten: [
        { titel: texte.spalteArtikel, art: 'text' },
        { titel: texte.spalteUmsatz, art: 'euro' },
      ],
      zeilen: umsatzZeilen,
      summe: umsatzZeilen.length > 0 ? [texte.summe, summeVon(umsatzZeilen, 1)] : null,
    });
    grafiken.umsatz = grafikBauen('grafikUmsatz', texte.grafikUmsatz,
      umsatzZeilen.map((z) => ({ beschriftung: z[0], wert: z[1], farbe: umsatzFarbe })), 'euro', umsatzFarbe);

    const gewinnZeilen = artikelSortieren(artikel, sortierung, 'gewinn_cent')
      .map((a) => [a.artikel_name, a.gewinn_cent, a.stueck_ohne_kosten]);
    abschnitte.push({
      id: 'gewinn', blattName: texte.blattGewinn, titel: texte.titelGewinn,
      spalten: [
        { titel: texte.spalteArtikel, art: 'text' },
        { titel: texte.spalteGewinn, art: 'euro' },
        { titel: texte.spalteStueckOhneKosten, art: 'zahl' },
      ],
      zeilen: gewinnZeilen,
      summe: gewinnZeilen.length > 0
        ? [texte.summe, summeVon(gewinnZeilen, 1), summeVon(gewinnZeilen, 2)]
        : null,
    });
    grafiken.gewinn = grafikBauen('grafikGewinn', texte.grafikGewinn,
      gewinnZeilen.map((z) => ({ beschriftung: z[0], wert: z[1], farbe: z[2] > 0 ? farbeOhneKosten : gewinnFarbe })),
      'euro', gewinnFarbe,
      [{ farbe: gewinnFarbe, text: texte.mitKosten }, { farbe: farbeOhneKosten, text: texte.ohneKosten }]);
  }

  const verlaufZeilen = verlauf.map((v) => [v.beschriftung, v.stueck]);
  abschnitte.push({
    id: 'verlauf',
    blattName: mitDatum ? texte.blattProTag : texte.blattTagesverlauf,
    titel: mitDatum ? texte.titelProTag : texte.titelTagesverlauf,
    spalten: [
      { titel: mitDatum ? texte.spalteTag : texte.spalteStunde, art: 'text' },
      { titel: texte.spalteStueck, art: 'zahl' },
    ],
    zeilen: verlaufZeilen,
    summe: verlaufZeilen.length > 0 ? [texte.summe, summeVon(verlaufZeilen, 1)] : null,
  });
  grafiken.verlauf = grafikBauen('grafikVerlauf', mitDatum ? texte.grafikProTag : texte.grafikTagesverlauf,
    verlaufZeilen.map((z) => ({ beschriftung: z[0], wert: z[1], farbe: stueckFarbe })), 'zahl', stueckFarbe);

  const stornoSpalten = [
    ...(mitDatum ? [{ titel: texte.spalteDatum, art: 'text', breite: 62 }] : []),
    { titel: texte.spalteUhrzeit, art: 'text', breite: 62 },
    { titel: texte.spalteNummer, art: 'nummer' },
    { titel: texte.spalteArtikel, art: 'text' },
    { titel: texte.spalteBetrag, art: 'euro' },
    { titel: texte.spalteStorniertVon, art: 'text', breite: 70 },
  ];
  const stornoZeilen = stornos.map((s) => [
    ...(mitDatum ? [datumAnzeigen(s.datum)] : []),
    `${s.zeit}${uhr}`, s.nummer, s.artikel_name, s.preis_cent, s.storniert_von,
  ]);
  const betragsSpalte = mitDatum ? 4 : 3;
  let stornoSumme = null;
  if (zeigtGeld && stornoZeilen.length > 0) {
    stornoSumme = stornoSpalten.map(() => '');
    stornoSumme[0] = texte.summe;
    stornoSumme[betragsSpalte] = summeVon(stornoZeilen, betragsSpalte);
  }
  abschnitte.push({
    id: 'stornos', blattName: texte.blattStornos, titel: mitDatum ? texte.titelZeitraum : texte.titelTag,
    spalten: stornoSpalten, zeilen: stornoZeilen, summe: stornoSumme,
  });

  const bloecke = abschnitte.map((abschnitt) => ({
    id: abschnitt.id, blattName: abschnitt.blattName, abschnitt, grafik: grafiken[abschnitt.id] ?? null,
  }));

  const auswahlGruppen = [{
    titel: texte.blattUebersicht,
    eintraege: [{ id: 'uebersicht', art: 'kennzahlen', beschriftung: texte.auswahlKennzahlen }],
  }];
  for (const block of bloecke) {
    const eintraege = [{ id: block.abschnitt.id, art: 'tabelle', beschriftung: texte.auswahlTabelle }];
    if (block.grafik) eintraege.push({ id: block.grafik.id, art: 'grafik', beschriftung: texte.auswahlGrafik });
    auswahlGruppen.push({ titel: block.abschnitt.titel, eintraege });
  }

  return {
    titel: texte.titel,
    untertitel: untertitelZeilen.join('\n'),
    uebersichtName: texte.blattUebersicht,
    kennzahlSpalten: [texte.spalteKennzahl, texte.spalteWert],
    kennzahlen: kennzahlenBauen(gesamt, stosszeit, sprache),
    abschnitte,
    bloecke,
    auswahlGruppen,
    texte: {
      erstelltAm: texte.erstelltAm, seite: texte.seite, von: texte.von,
      keineEintraege: texte.keineEintraege,
      stueckOhneKosten: `${texte.stueckOhneKostenVorspann}${gesamt.stueck_ohne_kosten}${texte.stueckOhneKostenNachspann}`,
    },
    hinweisOhneKosten: zeigtGeld && gesamt.stueck_ohne_kosten > 0,
  };
}

export function exportDateiname(eingabe, endung) {
  const texte = eingabe.sprache === 'tr' ? exportTr : exportDe;
  const zeitraum = eingabe.ansicht === 'zeitraum' && eingabe.bis !== eingabe.von
    ? `${eingabe.von}${texte.dateiBis}${eingabe.bis}`
    : eingabe.von;
  return `${texte.dateiPraefix}_${zeitraum}.${endung}`;
}

export function alleAuswahlIds(modell) {
  return modell.auswahlGruppen.flatMap((gruppe) => gruppe.eintraege.map((e) => e.id));
}

export function modellAuswaehlen(modell, ids) {
  const mitUebersicht = ids.includes('uebersicht');
  const bloecke = [];
  for (const block of modell.bloecke) {
    const abschnitt = ids.includes(block.id) ? block.abschnitt : null;
    const grafik = block.grafik && ids.includes(block.grafik.id) ? block.grafik : null;
    if (abschnitt || grafik) bloecke.push({ ...block, abschnitt, grafik });
  }
  return {
    ...modell,
    kennzahlen: mitUebersicht ? modell.kennzahlen : [],
    hinweisOhneKosten: mitUebersicht && modell.hinweisOhneKosten,
    abschnitte: bloecke.map((b) => b.abschnitt).filter((a) => a !== null),
    bloecke,
  };
}
