import Dialog from '../komponenten/Dialog.jsx';

export default function NetzwerkHilfeDialog({ adresse, onSchliessen }) {
  return (
    <Dialog titel="Andere Geräte verbinden" onSchliessen={onSchliessen}>
      <p className="mb-4 text-schrift-gedimmt">
        Kasse, Ausgabe und der Fernseher laufen auf eigenen Geräten (Tablet, Handy,
        Fernseher) und öffnen Cermes über das Netzwerk. Dafür brauchen sie die
        Netzwerk-Adresse dieses Computers. Alle Geräte müssen im selben WLAN sein.
      </p>
      {adresse ? (
        <p className="mb-4 text-schrift-gedimmt">
          Öffne auf dem anderen Gerät im Browser <strong>http://{adresse}</strong>{' '}
          oder scanne den QR-Code neben diesem Hinweis.
        </p>
      ) : (
        <>
          <p className="mb-4 text-schrift-gedimmt">
            Die Adresse konnte diesmal nicht automatisch ermittelt werden. Du findest
            sie so von Hand:
          </p>
          <ul className="mb-4 list-disc space-y-2 pl-5 text-schrift-gedimmt">
            <li>
              <strong>Windows:</strong> Einstellungen → Netzwerk und Internet →
              Eigenschaften. Dort steht die „IPv4-Adresse“.
            </li>
            <li>
              <strong>Mac:</strong> Systemeinstellungen → WLAN → bei der aktiven
              Verbindung auf „Details“. Dort steht die IP-Adresse.
            </li>
          </ul>
          <p className="mb-4 text-schrift-gedimmt">
            Öffne dann auf dem anderen Gerät im Browser die gefundene Adresse mit
            <code>:8080</code> dahinter, z. B. <code>http://192.168.1.50:8080</code>.
          </p>
        </>
      )}
      <button
        onClick={onSchliessen}
        className="mt-2 w-full cursor-pointer rounded-full border border-linie py-2 text-sm text-schrift-gedimmt hover:bg-flaeche-hell"
      >
        Verstanden
      </button>
    </Dialog>
  );
}
