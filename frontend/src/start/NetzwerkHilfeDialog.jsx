import Dialog from '../komponenten/Dialog.jsx';
import { Button } from '@/komponenten/ui/button';
import { de, tr } from '../sprache/netzwerkHilfeDialog.js';

export default function NetzwerkHilfeDialog({ adresse, onSchliessen, sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  return (
    <Dialog titel={texte.titel} onSchliessen={onSchliessen}>
      <p className="mb-4 text-schrift-gedimmt">
        {texte.einleitung}
      </p>
      {adresse ? (
        <p className="mb-4 text-schrift-gedimmt">
          {texte.mitAdresseVorspann} <strong className="text-schrift">http://{adresse}</strong>{' '}
          {texte.mitAdresseNachspann}
        </p>
      ) : (
        <>
          <p className="mb-4 text-schrift-gedimmt">
            {texte.ohneAdresseHinweis}
          </p>
          <ul className="mb-4 list-disc space-y-2 pl-5 text-schrift-gedimmt">
            <li>
              <strong>Windows:</strong> {texte.windowsAnleitung}
            </li>
            <li>
              <strong>Mac:</strong> {texte.macAnleitung}
            </li>
          </ul>
          <p className="mb-4 text-schrift-gedimmt">
            {texte.abschlussVorspann}
            <code className="rounded bg-flaeche-hell px-1">:8080</code> {texte.abschlussNachspann} <code className="rounded bg-flaeche-hell px-1">http://192.168.1.50:8080</code>.
          </p>
        </>
      )}
      <Button variant="outline" onClick={onSchliessen} className="mt-2 w-full cursor-pointer text-schrift-gedimmt">
        {texte.verstanden}
      </Button>
    </Dialog>
  );
}
