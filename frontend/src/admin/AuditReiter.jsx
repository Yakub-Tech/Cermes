import Reiterleiste from '../komponenten/Reiterleiste.jsx';

const BEREICHE = ['', 'kasse', 'storno', 'ausgabe', 'artikel', 'benutzer', 'anmeldung', 'einstellungen', 'bilder', 'backup'];

const REITER_TEXT_SCHLUESSEL = {
  '': 'reiterAlle', kasse: 'reiterKasse', storno: 'reiterStorno', ausgabe: 'reiterAusgabe',
  artikel: 'reiterArtikel', benutzer: 'reiterBenutzer', anmeldung: 'reiterAnmeldung',
  einstellungen: 'reiterEinstellungen', bilder: 'reiterBilder', backup: 'reiterBackup',
};

export default function AuditReiter({ bereich, onWahl, texte }) {
  const reiter = BEREICHE.map((wert) => [wert, texte[REITER_TEXT_SCHLUESSEL[wert]]]);
  return <Reiterleiste reiter={reiter} aktiv={bereich} onWahl={onWahl} className="mb-4" />;
}
