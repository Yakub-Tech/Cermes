import { useRef } from 'react';

const STANDARD_BUTTON_KLASSE =
  'cursor-pointer rounded-lg border border-linie px-4 py-2 text-schrift-gedimmt hover:bg-flaeche-hell';

export default function DateiAuswahl({
  akzeptiert, beschriftung = 'Datei auswählen', wert, onWahl, buttonKlasse,
}) {
  const eingabeRef = useRef(null);

  function dateiGewaehlt(ereignis) {
    const datei = ereignis.target.files[0] || null;
    onWahl(datei);
    ereignis.target.value = '';
  }

  return (
    <div className="flex items-center gap-3">
      <input ref={eingabeRef} type="file" accept={akzeptiert} onChange={dateiGewaehlt}
        className="sr-only" />
      <button type="button" onClick={() => eingabeRef.current.click()}
        className={buttonKlasse ?? STANDARD_BUTTON_KLASSE}>
        {beschriftung}
      </button>
      {wert !== undefined && (
        <span className="text-schrift-gedimmt">{wert ? wert.name : 'Keine Datei gewählt'}</span>
      )}
    </div>
  );
}
