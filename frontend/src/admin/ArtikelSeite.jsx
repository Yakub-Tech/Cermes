import { useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, formatEuro } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import Pillenschalter from '../komponenten/Pillenschalter.jsx';
import { Button } from '@/komponenten/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/komponenten/ui/table';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';
import ArtikelFormular from './ArtikelFormular.jsx';
import StartnummerDialog from './StartnummerDialog.jsx';
import { beideSprachenName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/artikel.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function ArtikelSeite({ rolle, sprache = 'de' }) {
  const { neueste, ladefehler } = useNeuesteAntwort(laden);
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [artikelListe, setArtikelListe] = useState([]);
  const [beilagen, setBeilagen] = useState([]);
  const [formular, setFormular] = useState(null);
  const [startnummer, setStartnummer] = useState(null);
  const [loeschung, setLoeschung] = useState(null);
  const [fehler, setFehler] = useState('');

  function artikelLaden() {
    neueste('/api/artikel', apiGet('/api/artikel'), setArtikelListe).catch(() => {});
  }
  function beilagenLaden() {
    neueste('/api/beilagen', apiGet('/api/beilagen'), setBeilagen).catch(() => {});
  }
  function laden() {
    artikelLaden();
    beilagenLaden();
  }
  useLiveUpdate(['artikel', 'beilagen', 'kaertchen'], artikelLaden);
  useLiveUpdate(['beilagen'], beilagenLaden);

  function beilagenNamen(ids) {
    return beilagen.filter((b) => ids.includes(b.id))
      .map((b) => beideSprachenName(b.name, b.name_tr)).join(', ');
  }

  async function speichern(daten) {
    try {
      if (formular.artikel) {
        await apiPut(`/api/artikel/${formular.artikel.id}`, daten);
      } else {
        await apiPost('/api/artikel', daten);
      }
    } catch (f) {
      laden();
      throw f;
    }
    setFormular(null);
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-base font-semibold tracking-tight text-schrift">{texte.titel}</h2>

      <Button onClick={() => setFormular({ artikel: null })} className="mb-4 px-4 text-sm font-bold">
        {texte.artikelAnlegen}
      </Button>

      {ladefehler && <LadefehlerHinweis sprache={sprache} onErneut={laden} />}

      {fehler && <Hinweiskasten art="fehler" className="mb-2.5 px-2 py-1.5 text-sm">{fehler}</Hinweiskasten>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{texte.spalteArtikel}</TableHead>
            <TableHead>{texte.spaltePreis}</TableHead>
            {rolle === 'admin' && <TableHead>{texte.spalteKosten}</TableHead>}
            <TableHead>{texte.spalteBeilagen}</TableHead>
            <TableHead>{texte.spalteWeiterBeiNr}</TableHead>
            <TableHead>{texte.spalteAktiv}</TableHead>
            <TableHead>{texte.spalteAusverkauft}</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artikelListe.length === 0 && !ladefehler && (
            <TableRow>
              <TableCell colSpan={rolle === 'admin' ? 8 : 7} className="py-4 text-schrift-gedimmt">
                {texte.keineArtikel}
              </TableCell>
            </TableRow>
          )}
          {artikelListe.map((artikel) => {
            const gedimmt = artikel.aktiv ? '' : 'opacity-50';
            return (
              <TableRow key={artikel.id}>
                <TableCell className={gedimmt}>
                  <span className="mr-1.5 inline-block h-4 w-4 rounded-full align-middle ring-1 ring-linie"
                    style={{ backgroundColor: artikel.farbe }} />
                  {artikel.bild_url && (
                    <img src={artikel.bild_url} alt="" className="mr-1.5 inline-block h-6 w-6 rounded object-cover align-middle" />
                  )}
                  <span className="text-sm">{beideSprachenName(artikel.name, artikel.name_tr)}</span>
                </TableCell>
                <TableCell className={`nummer ${gedimmt}`}>{formatEuro(artikel.preis_cent)}</TableCell>
                {rolle === 'admin' && (
                  <TableCell className={`nummer ${gedimmt}`}>
                    {artikel.einkaufskosten_cent != null
                      ? formatEuro(artikel.einkaufskosten_cent)
                      : <span className="text-schrift-gedimmt">—</span>}
                  </TableCell>
                )}
                <TableCell className={`max-w-40 truncate text-schrift-gedimmt ${gedimmt}`}>
                  {beilagenNamen(artikel.beilagen_ids) || '—'}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setStartnummer(artikel)}
                    className="nummer px-2 text-sm">
                    {artikel.naechste_nummer}
                  </Button>
                  {artikel.hinweis && (
                    <p className="mt-1 max-w-48 text-xs text-gefahr-schrift">{artikel.hinweis}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Pillenschalter an={!!artikel.aktiv}
                    onClick={() => apiPut(`/api/artikel/${artikel.id}/aktiv`, {
                      aktiv: artikel.aktiv ? 0 : 1,
                    }).catch((f) => setFehler(f.message))}>
                    {artikel.aktiv ? texte.aktiv : texte.inaktiv}
                  </Pillenschalter>
                </TableCell>
                <TableCell>
                  <Pillenschalter an={!!artikel.ausverkauft} art="gefahr"
                    onClick={() => apiPut(`/api/artikel/${artikel.id}/ausverkauft`, {
                      ausverkauft: artikel.ausverkauft ? 0 : 1,
                    }).catch((f) => setFehler(f.message))}>
                    {artikel.ausverkauft ? texte.ausverkauft : texte.verfuegbar}
                  </Pillenschalter>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button variant="outline" size="sm" onClick={() => setFormular({ artikel })}
                    className="mr-1.5 px-2 text-sm text-schrift-gedimmt">
                    {texte.bearbeiten}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLoeschung(artikel)}
                    className="px-2 text-sm text-gefahr-schrift">
                    {texte.loeschen}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {formular && (
        <ArtikelFormular artikel={formular.artikel} beilagen={beilagen} rolle={rolle}
          onSpeichern={speichern} onAbbrechen={() => setFormular(null)} sprache={sprache} />
      )}

      {startnummer && (
        <StartnummerDialog artikel={startnummer}
          onFertig={() => setStartnummer(null)}
          onAbbrechen={() => setStartnummer(null)} sprache={sprache} />
      )}

      {loeschung && (
        <Dialog titel={texte.artikelLoeschenTitel} onSchliessen={() => setLoeschung(null)}>
          <p className="mb-4 text-sm">
            {texte.loeschenVorspann}{beideSprachenName(loeschung.name, loeschung.name_tr)}{texte.loeschenNachspann}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLoeschung(null)}
              className="flex-1 text-sm text-schrift-gedimmt">
              {texte.abbrechen}
            </Button>
            <Button variant="gefahr"
              onClick={() => apiDelete(`/api/artikel/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 text-sm font-bold">
              {texte.jaLoeschen}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
