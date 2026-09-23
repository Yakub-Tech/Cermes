export default function AuditSeitenwahl({ seite, seiten, gesamt, onSeiteWaehlen, texte }) {
  return (
    <div className="mt-4 flex items-center gap-2.5 text-sm text-schrift-gedimmt">
      <button onClick={() => onSeiteWaehlen(seite - 1)} disabled={seite <= 1}
        className="cursor-pointer rounded-full border border-linie px-2.5 py-1 hover:bg-flaeche-hell disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
        {texte.vorherigeSeite}
      </button>
      <span>{texte.seiteVon.replace('{seite}', seite).replace('{seiten}', seiten)}</span>
      <button onClick={() => onSeiteWaehlen(seite + 1)} disabled={seite >= seiten}
        className="cursor-pointer rounded-full border border-linie px-2.5 py-1 hover:bg-flaeche-hell disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
        {texte.naechsteSeite}
      </button>
      <span>{gesamt} {gesamt === 1 ? texte.gesamtSuffixEinzahl : texte.gesamtSuffix}</span>
    </div>
  );
}
