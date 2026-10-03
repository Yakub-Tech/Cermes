import { cn } from '@/hilfen/utils';

export default function Reiterleiste({ reiter, aktiv, onWahl, className, knopfKlasse, betont = false }) {
  const aktivFarbe = betont
    ? 'bg-haupt font-semibold text-haupt-text shadow-sm'
    : 'bg-flaeche font-semibold text-schrift shadow-sm';

  return (
    <div className={cn(
      'inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-linie bg-flaeche-hell p-0.5',
      className,
    )}>
      {reiter.map(([wert, text]) => (
        <button key={wert || 'alle'} type="button" onClick={() => onWahl(wert)}
          aria-pressed={aktiv === wert}
          className={cn(
            'shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-sm whitespace-nowrap transition-colors',
            aktiv === wert ? aktivFarbe : 'text-schrift-gedimmt hover:text-schrift',
            knopfKlasse,
          )}>
          {text}
        </button>
      ))}
    </div>
  );
}
