import { useEffect, useState } from 'react';
import { apiGet, apiPut, apiDelete, apiUpload } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Zahlenfeld from '../komponenten/Zahlenfeld.jsx';
import DateiAuswahl from '../komponenten/DateiAuswahl.jsx';
import Dialog from '../komponenten/Dialog.jsx';

export default function EinstellungenSeite() {
  const [warnminuten, setWarnminuten] = useState('');
  const [meldung, setMeldung] = useState('');
  const [fehler, setFehler] = useState('');

  const [abmeldeMinuten, setAbmeldeMinuten] = useState('');
  const [abmeldeMeldung, setAbmeldeMeldung] = useState('');
  const [abmeldeFehler, setAbmeldeFehler] = useState('');

  const [logos, setLogos] = useState([]);
  const [logoLoeschung, setLogoLoeschung] = useState(null);
  const [logoFehler, setLogoFehler] = useState('');

  useEffect(() => {
    apiGet('/api/einstellungen')
      .then((e) => {
        setWarnminuten(String(e.abholbereit_warnminuten));
        setAbmeldeMinuten(String(e.inaktivitaets_abmeldung_minuten));
      })
      .catch((f) => setFehler(f.message));
  }, []);

  useLiveUpdate(['logo'], () => {
    apiGet('/api/logo').then(setLogos).catch(() => {});
  });

  async function speichern(ereignis) {
    ereignis.preventDefault();
    setMeldung('');
    setFehler('');
    try {
      await apiPut('/api/einstellungen', { abholbereit_warnminuten: Number(warnminuten) });
      setMeldung('Gespeichert.');
    } catch (f) {
      setFehler(f.message);
    }
  }

  async function abmeldezeitSpeichern(ereignis) {
    ereignis.preventDefault();
    setAbmeldeMeldung('');
    setAbmeldeFehler('');
    try {
      await apiPut('/api/einstellungen', { inaktivitaets_abmeldung_minuten: Number(abmeldeMinuten) });
      setAbmeldeMeldung('Gespeichert.');
    } catch (f) {
      setAbmeldeFehler(f.message);
    }
  }

  async function logoHochladen(datei) {
    if (!datei) return;
    setLogoFehler('');
    try {
      const formData = new FormData();
      formData.append('logo', datei);
      await apiUpload('/api/logo', formData);
    } catch (f) {
      setLogoFehler(f.message);
    }
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-base text-navy">Einstellungen</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form onSubmit={speichern} className="rounded-lg border border-linie bg-flaeche p-4">
          <h3 className="mb-1.5 font-display text-sm text-navy">Warnzeit</h3>
          <label className="mb-1 block text-schrift-gedimmt" htmlFor="warnminuten">
            Warnzeit für liegengebliebene abholbereite Kärtchen (Minuten)
          </label>
          <p className="mb-2 text-xs text-schrift-gedimmt">
            Wartet ein abholbereites Kärtchen länger als diese Zeit, wird es in der
            Ausgabe deutlich hervorgehoben.
          </p>
          <Zahlenfeld id="warnminuten" min="0" wert={warnminuten} onWahl={setWarnminuten}
            klasse="mb-2.5 w-20" />
          {meldung && <p className="mb-2 text-navy">{meldung}</p>}
          {fehler && <p className="mb-2 rounded bg-blau/30 px-2 py-1.5 text-blau">{fehler}</p>}
          <button type="submit"
            className="block cursor-pointer rounded-full bg-blau px-4 py-1.5 font-bold text-flaeche hover:bg-blau-hell">
            Speichern
          </button>
        </form>

        <form onSubmit={abmeldezeitSpeichern} className="rounded-lg border border-linie bg-flaeche p-4">
          <h3 className="mb-1.5 font-display text-sm text-navy">Automatische Abmeldung</h3>
          <label className="mb-1 block text-schrift-gedimmt" htmlFor="abmeldeminuten">
            Zeit bis zur automatischen Abmeldung bei Inaktivität (Minuten)
          </label>
          <p className="mb-2 text-xs text-schrift-gedimmt">
            Wird in Kasse, Ausgabe oder Admin so lange nicht geklickt, getippt oder eine
            Taste gedrückt, meldet sich die Ansicht automatisch ab.
          </p>
          <Zahlenfeld id="abmeldeminuten" min="1" wert={abmeldeMinuten} onWahl={setAbmeldeMinuten}
            klasse="mb-2.5 w-20" />
          {abmeldeMeldung && <p className="mb-2 text-navy">{abmeldeMeldung}</p>}
          {abmeldeFehler && <p className="mb-2 rounded bg-blau/30 px-2 py-1.5 text-blau">{abmeldeFehler}</p>}
          <button type="submit"
            className="block cursor-pointer rounded-full bg-blau px-4 py-1.5 font-bold text-flaeche hover:bg-blau-hell">
            Speichern
          </button>
        </form>

        <div className="rounded-lg border border-linie bg-flaeche p-4">
          <h3 className="mb-1.5 font-display text-sm text-navy">Vereinslogo</h3>
          <p className="mb-2.5 text-xs text-schrift-gedimmt">
            Das aktive Logo erscheint in der Kopfzeile und auf der Anmeldeseite. Ohne
            aktives Logo wird ein Platzhalter angezeigt. Erlaubt sind PNG, JPEG und
            WebP bis 10 MB. Änderungen wirken sofort.
          </p>

          {logoFehler && <p className="mb-2.5 rounded bg-blau/30 px-2 py-1.5 text-blau">{logoFehler}</p>}

          {logos.length === 0 && (
            <p className="mb-2.5 text-schrift-gedimmt">
              Noch keine eigenen Logos hochgeladen, es wird der Platzhalter
              angezeigt.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <DateiAuswahl grossflaechig akzeptiert="image/png,image/jpeg,image/webp"
              beschriftung="Logo hochladen"
              typFehlerText="Bitte nur PNG-, JPEG- oder WebP-Bilder ablegen."
              onWahl={logoHochladen} />
            {logos.map((logo) => (
              <div key={logo.id} className="rounded-lg border border-linie p-2">
                <img src={logo.url} alt="Vereinslogo"
                  className={`mb-2 h-16 w-full rounded-lg object-contain ${logo.aktiv ? '' : 'opacity-40'}`} />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => apiPut(`/api/logo/${logo.id}`, { aktiv: logo.aktiv ? 0 : 1 })
                      .catch((f) => setLogoFehler(f.message))}
                    className={`cursor-pointer rounded-full px-2 py-1 text-xs font-semibold ${
                      logo.aktiv ? 'bg-navy text-grund' : 'border border-linie text-schrift-gedimmt'
                    }`}>
                    {logo.aktiv ? 'aktiv' : 'inaktiv'}
                  </button>
                  <button onClick={() => setLogoLoeschung(logo)}
                    className="cursor-pointer rounded-full border border-linie px-1.5 py-1 text-xs text-blau-hell hover:bg-flaeche-hell">
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {logoLoeschung && (
        <Dialog titel="Logo entfernen?" onSchliessen={() => setLogoLoeschung(null)}>
          <img src={logoLoeschung.url} alt="Vereinslogo" className="mb-2.5 max-h-32 w-full rounded-lg object-contain" />
          <p className="mb-4">Das Logo wird dauerhaft gelöscht.</p>
          <div className="flex gap-2">
            <button onClick={() => setLogoLoeschung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button
              onClick={() => apiDelete(`/api/logo/${logoLoeschung.id}`)
                .then(() => setLogoLoeschung(null))
                .catch((f) => { setLogoFehler(f.message); setLogoLoeschung(null); })}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 font-bold text-flaeche hover:bg-blau-hell">
              Ja, entfernen
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
