import { useEffect, useState } from 'react';
import { apiGet, apiPut, apiDelete, apiUpload } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Zahlenfeld from '../komponenten/Zahlenfeld.jsx';
import DateiAuswahl from '../komponenten/DateiAuswahl.jsx';
import Dialog from '../komponenten/Dialog.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import Pillenschalter from '../komponenten/Pillenschalter.jsx';
import TvDesignKarte from './TvDesignKarte.jsx';
import { Button } from '@/komponenten/ui/button';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/einstellungen.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function EinstellungenSeite({ sprache = 'de' }) {
  const { neueste } = useNeuesteAntwort(logosLaden);
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
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

  function logosLaden() {
    neueste('/api/logo', apiGet('/api/logo'), setLogos).catch(() => {});
  }
  useLiveUpdate(['logo'], logosLaden);

  async function speichern(ereignis) {
    ereignis.preventDefault();
    setMeldung('');
    setFehler('');
    try {
      await apiPut('/api/einstellungen', { abholbereit_warnminuten: Number(warnminuten) });
      setMeldung(texte.gespeichert);
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
      setAbmeldeMeldung(texte.gespeichert);
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
      <h2 className="mb-4 font-display text-base font-semibold tracking-tight text-schrift">{texte.titel}</h2>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <form onSubmit={speichern} className="kaertchen-schatten rounded-lg border border-linie bg-flaeche p-4">
          <h3 className="mb-1.5 font-display text-sm font-semibold text-schrift">{texte.warnzeitUeberschrift}</h3>
          <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="warnminuten">
            {texte.warnzeitLabel}
          </label>
          <p className="mb-2 text-xs text-schrift-gedimmt">
            {texte.warnzeitErklaerung}
          </p>
          <Zahlenfeld id="warnminuten" min="0" wert={warnminuten} onWahl={setWarnminuten}
            klasse="mb-2.5 w-20" />
          {meldung && <Hinweiskasten art="erfolg" className="mb-2 px-2 py-1.5 text-sm">{meldung}</Hinweiskasten>}
          {fehler && <Hinweiskasten art="fehler" className="mb-2 px-2 py-1.5 text-sm">{fehler}</Hinweiskasten>}
          <Button type="submit" className="px-4 text-sm font-bold">
            {texte.speichern}
          </Button>
        </form>

        <form onSubmit={abmeldezeitSpeichern} className="kaertchen-schatten rounded-lg border border-linie bg-flaeche p-4">
          <h3 className="mb-1.5 font-display text-sm font-semibold text-schrift">{texte.abmeldungUeberschrift}</h3>
          <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="abmeldeminuten">
            {texte.abmeldungLabel}
          </label>
          <p className="mb-2 text-xs text-schrift-gedimmt">
            {texte.abmeldungErklaerung}
          </p>
          <Zahlenfeld id="abmeldeminuten" min="1" wert={abmeldeMinuten} onWahl={setAbmeldeMinuten}
            klasse="mb-2.5 w-20" />
          {abmeldeMeldung && <Hinweiskasten art="erfolg" className="mb-2 px-2 py-1.5 text-sm">{abmeldeMeldung}</Hinweiskasten>}
          {abmeldeFehler && <Hinweiskasten art="fehler" className="mb-2 px-2 py-1.5 text-sm">{abmeldeFehler}</Hinweiskasten>}
          <Button type="submit" className="px-4 text-sm font-bold">
            {texte.speichern}
          </Button>
        </form>

        <TvDesignKarte texte={texte} />

        <div className="kaertchen-schatten rounded-lg border border-linie bg-flaeche p-4">
          <h3 className="mb-1.5 font-display text-sm font-semibold text-schrift">{texte.logoUeberschrift}</h3>
          <p className="mb-2.5 text-xs text-schrift-gedimmt">
            {texte.logoErklaerung}
          </p>

          {logoFehler && <Hinweiskasten art="fehler" className="mb-2.5 px-2 py-1.5 text-sm">{logoFehler}</Hinweiskasten>}

          {logos.length === 0 && (
            <p className="mb-2.5 text-sm text-schrift-gedimmt">
              {texte.keineLogos}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <DateiAuswahl grossflaechig akzeptiert="image/png,image/jpeg,image/webp"
              beschriftung={texte.logoHochladenBeschriftung}
              typFehlerText={texte.dateiTypFehler}
              onWahl={logoHochladen} sprache={sprache} />
            {logos.map((logo) => (
              <div key={logo.id} className="kaertchen-schatten rounded-lg border border-linie p-2">
                <img src={logo.url} alt={texte.logoAlt}
                  className={`mb-2 h-16 w-full rounded-lg bg-white object-contain ${logo.aktiv ? '' : 'opacity-40'}`} />
                <div className="flex items-center justify-between">
                  <Pillenschalter an={!!logo.aktiv}
                    onClick={() => apiPut(`/api/logo/${logo.id}`, { aktiv: logo.aktiv ? 0 : 1 })
                      .catch((f) => setLogoFehler(f.message))}>
                    {logo.aktiv ? texte.aktiv : texte.inaktiv}
                  </Pillenschalter>
                  <Button variant="outline" size="sm" onClick={() => setLogoLoeschung(logo)}
                    className="px-1.5 text-xs text-gefahr-schrift">
                    {texte.entfernen}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {logoLoeschung && (
        <Dialog titel={texte.logoEntfernenTitel} onSchliessen={() => setLogoLoeschung(null)}>
          <img src={logoLoeschung.url} alt={texte.logoAlt}
            className="mb-2.5 max-h-32 w-full rounded-lg bg-white object-contain" />
          <p className="mb-4 text-sm">{texte.logoWirdGeloescht}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLogoLoeschung(null)}
              className="flex-1 text-sm text-schrift-gedimmt">
              {texte.abbrechen}
            </Button>
            <Button variant="gefahr"
              onClick={() => apiDelete(`/api/logo/${logoLoeschung.id}`)
                .then(() => setLogoLoeschung(null))
                .catch((f) => { setLogoFehler(f.message); setLogoLoeschung(null); })}
              className="flex-1 text-sm font-bold">
              {texte.jaEntfernen}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
