import { useRef, useState } from 'react';

const STANDARD_BUTTON_KLASSE =
  'cursor-pointer rounded-full border border-linie px-4 py-2 text-schrift-gedimmt hover:bg-flaeche-hell';

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
  akzeptiert, beschriftung = 'Datei auswählen', wert, onWahl, buttonKlasse,
  grossflaechig = false, typFehlerText,
}) {
  const eingabeRef = useRef(null);
  const [ziehtDrueber, setZiehtDrueber] = useState(false);
  const [typFehler, setTypFehler] = useState('');

  function dateiUebernehmen(datei) {
    if (!datei) return;
    if (!passtZuAkzeptiert(datei, akzeptiert)) {
      setTypFehler(typFehlerText || 'Diese Datei wird nicht unterstützt.');
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

  const rahmenKlasse = ziehtDrueber ? 'border-blau bg-blau/10' : 'border-linie';

  if (grossflaechig) {
    return (
      <div className="flex flex-col gap-2">
        <div
          onClick={() => eingabeRef.current.click()}
          onDragOver={ueberFlaecheGezogen}
          onDragLeave={flaecheVerlassen}
          onDrop={dateiAbgelegt}
          className={`flex min-h-36 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-center text-sm text-schrift-gedimmt hover:bg-flaeche-hell ${rahmenKlasse}`}>
          {eingabe}
          <span className="font-semibold text-navy">{beschriftung}</span>
          <span>oder Datei hierher ziehen</span>
        </div>
        {typFehler && <p className="rounded bg-blau/30 px-3 py-2 text-blau">{typFehler}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={ueberFlaecheGezogen}
        onDragLeave={flaecheVerlassen}
        onDrop={dateiAbgelegt}
        className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 ${rahmenKlasse}`}>
        {eingabe}
        <button type="button" onClick={() => eingabeRef.current.click()}
          className={buttonKlasse ?? STANDARD_BUTTON_KLASSE}>
          {beschriftung}
        </button>
        {wert !== undefined && (
          <span className="text-schrift-gedimmt">{wert ? wert.name : 'Keine Datei gewählt'}</span>
        )}
      </div>
      {typFehler && <p className="rounded bg-blau/30 px-3 py-2 text-blau">{typFehler}</p>}
    </div>
  );
}
