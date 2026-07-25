import Dialog from '../komponenten/Dialog.jsx';

export default function WarenkorbVerlassenDialog({ onVerlassen, onZurueck }) {
  return (
    <Dialog titel="Warenkorb noch nicht abgeschlossen" onSchliessen={onZurueck}>
      <p className="mb-6 text-schrift-gedimmt">
        Der aktuelle Warenkorb ist noch nicht kassiert. Verlässt du die Kasse jetzt,
        gehen die bereits angetippten Positionen verloren und müssen neu eingegeben werden.
      </p>
      <div className="flex gap-3">
        <button onClick={onZurueck}
          className="flex-1 cursor-pointer rounded-full border border-linie py-2 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
          Zurück zur Kasse
        </button>
        <button onClick={onVerlassen}
          className="flex-1 cursor-pointer rounded-full bg-weinrot py-2 text-sm font-bold text-flaeche hover:bg-weinrot-hell">
          Warenkorb verwerfen und verlassen
        </button>
      </div>
    </Dialog>
  );
}
