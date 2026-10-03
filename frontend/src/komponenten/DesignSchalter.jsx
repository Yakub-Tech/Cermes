import { Moon, Sun } from 'lucide-react';

export default function DesignSchalter({ design, onWahl, texte }) {
  const optionen = [
    ['hell', Sun, texte.designHell],
    ['dunkel', Moon, texte.designDunkel],
  ];

  return (
    <div role="group" aria-label={texte.designWaehlen}
      className="inline-flex rounded-full border border-linie bg-flaeche-hell p-0.5">
      {optionen.map(([wert, Icon, beschriftung]) => (
        <button key={wert} type="button" onClick={() => onWahl(wert)}
          aria-label={beschriftung} aria-pressed={design === wert} title={beschriftung}
          className={`cursor-pointer rounded-full p-1.5 ${
            design === wert ? 'bg-flaeche text-schrift shadow-sm' : 'text-schrift-gedimmt hover:text-schrift'
          }`}>
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
