const BEREICHE = ['', 'kasse', 'storno', 'ausgabe', 'artikel', 'benutzer', 'anmeldung', 'einstellungen', 'bilder', 'backup'];

const REITER_TEXT_SCHLUESSEL = {
  '': 'reiterAlle', kasse: 'reiterKasse', storno: 'reiterStorno', ausgabe: 'reiterAusgabe',
  artikel: 'reiterArtikel', benutzer: 'reiterBenutzer', anmeldung: 'reiterAnmeldung',
  einstellungen: 'reiterEinstellungen', bilder: 'reiterBilder', backup: 'reiterBackup',
};

export default function AuditReiter({ bereich, onWahl, texte }) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {BEREICHE.map((wert) => (
        <button key={wert || 'alle'} onClick={() => onWahl(wert)}
          className={`kaertchen-schatten shrink-0 cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm ${
            bereich === wert ? 'bg-blau font-bold text-flaeche' : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
          }`}>
          {texte[REITER_TEXT_SCHLUESSEL[wert]]}
        </button>
      ))}
    </div>
  );
}
