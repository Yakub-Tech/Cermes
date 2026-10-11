import { formatEuro } from '../api.js';
import { gewinnmargeBerechnen } from './gewinnmarge.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/statistikKomponenten.js';

export function kennzahlenBauen(gesamt, stosszeit, sprache = 'de') {
  const texte = sprache === 'tr' ? eigeneTr : eigeneDe;
  const zeigtGeld = gesamt.umsatz_cent !== undefined;
  const marge = zeigtGeld ? gewinnmargeBerechnen(gesamt) : null;
  let margeAnzeige = '–';
  if (marge !== null) {
    if (sprache === 'tr') {
      margeAnzeige = marge < 0 ? `-%${Math.abs(marge)}` : `%${marge}`;
    } else {
      margeAnzeige = `${marge} %`;
    }
  }

  const kennzahlen = [
    { id: 'portionen', beschriftung: texte.portionenLabel, art: 'zahl', roh: gesamt.stueck, wert: gesamt.stueck },
  ];
  if (zeigtGeld) {
    kennzahlen.push(
      { id: 'umsatz', beschriftung: texte.umsatzLabel, art: 'euro', roh: gesamt.umsatz_cent, wert: formatEuro(gesamt.umsatz_cent) },
      { id: 'gewinn', beschriftung: texte.gewinnLabel, art: 'euro', roh: gesamt.gewinn_cent, wert: formatEuro(gesamt.gewinn_cent) },
      { id: 'marge', beschriftung: texte.margeLabel, art: 'text', roh: margeAnzeige, wert: margeAnzeige },
    );
  }
  kennzahlen.push(
    { id: 'stosszeit', beschriftung: texte.stosszeitLabel, art: 'text', roh: stosszeit ?? '–', wert: stosszeit ?? '–' },
  );
  return kennzahlen;
}
