import { berechneUrheberrechtsText, URHEBERRECHT_STARTJAHR } from './urheberrechtsText.js';
import { berlinerJahr } from './uhrzeitFormat.js';

export default function Urheberrechtshinweis() {
  const text = berechneUrheberrechtsText(URHEBERRECHT_STARTJAHR, berlinerJahr(new Date()));

  return (
    <span className="fixed bottom-1 right-1.5 z-50 text-[10px] text-schrift-gedimmt opacity-35 pointer-events-none select-none">
      {text}
    </span>
  );
}
