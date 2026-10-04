import { useRef, useState } from 'react';
import { de, tr } from '../sprache/dateiAuswahl.js';
import Hinweiskasten from './Hinweiskasten.jsx';

const STANDARD_BUTTON_KLASSE =
  'cursor-pointer rounded-lg border border-linie px-2.5 py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell';

function passtZuAkzeptiert(datei, akzeptiert) {
  if (!akzeptiert) return true;
  const eintraege = akzeptiert.split(',').map((eintrag) => eintrag.trim().toLowerCase());
  return eintraege.some((eintrag) => {
    if (eintrag.startsWith('.')) {
      return datei.name.toLowerCase().endsWith(eintrag);
    }
    return datei.type.toLowerCase() === eintrag;
  });
}

export default function DateiAuswahl({
  akzeptiert, beschriftung, wert, onWahl, buttonKlasse,
  grossflaechig = false, typFehlerText, sprache = 'de',
}) {
  const texte = sprache === 'tr' ? tr : de;
  const beschriftungAngezeigt = beschriftung ?? texte.standardBeschriftung;
  const eingabeRef = useRef(null);
  const [ziehtDrueber, setZiehtDrueber] = useState(false);
  const [typFehler, setTypFehler] = useState('');

  function dateiUebernehmen(datei) {
    if (!datei) return;
    if (!passtZuAkzeptiert(datei, akzeptiert)) {
      setTypFehler(typFehlerText || texte.unbekannterTyp);
      return;
    }
    setTypFehler('');
    onWahl(datei);
  }

  function dateiGewaehlt(ereignis) {
    dateiUebernehmen(ereignis.target.files[0] || null);
    ereignis.target.value = '';
  }

  function ueberFlaecheGezogen(ereignis) {
    ereignis.preventDefault();
    setZiehtDrueber(true);
  }

  function flaecheVerlassen() {
    setZiehtDrueber(false);
  }

  function dateiAbgelegt(ereignis) {
    ereignis.preventDefault();
    setZiehtDrueber(false);
    dateiUebernehmen(ereignis.dataTransfer.files[0] || null);
  }

  const eingabe = (
    <input ref={eingabeRef} type="file" accept={akzeptiert} onChange={dateiGewaehlt}
      className="sr-only" />
  );

  const rahmenKlasse = ziehtDrueber ? 'border-schrift-gedimmt bg-flaeche-hell' : 'border-linie';

  if (grossflaechig) {
    return (
      <div className="flex flex-col gap-2">
        <div
          onClick={() => eingabeRef.current.click()}
          onDragOver={ueberFlaecheGezogen}
          onDragLeave={flaecheVerlassen}
          onDrop={dateiAbgelegt}
          className={`flex min-h-24 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-2 text-center text-sm text-schrift-gedimmt hover:bg-flaeche-hell ${rahmenKlasse}`}>
          {eingabe}
          <span className="font-semibold text-schrift">{beschriftungAngezeigt}</span>
          <span>{texte.hierherZiehen}</span>
        </div>
        {typFehler && <Hinweiskasten art="fehler" className="px-2 py-1.5 text-sm">{typFehler}</Hinweiskasten>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={ueberFlaecheGezogen}
        onDragLeave={flaecheVerlassen}
        onDrop={dateiAbgelegt}
        className={`flex items-center gap-2 rounded-lg border-2 border-dashed px-2.5 py-2 text-sm ${rahmenKlasse}`}>
        {eingabe}
        <button type="button" onClick={() => eingabeRef.current.click()}
          className={buttonKlasse ?? STANDARD_BUTTON_KLASSE}>
          {beschriftungAngezeigt}
        </button>
        {wert !== undefined && (
          <span className="text-schrift-gedimmt">{wert ? wert.name : texte.keineDatei}</span>
        )}
      </div>
      {typFehler && <Hinweiskasten art="fehler" className="px-2 py-1.5 text-sm">{typFehler}</Hinweiskasten>}
    </div>
  );
}
