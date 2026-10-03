import { cn } from '@/hilfen/utils';

export default function Reiterleiste({ reiter, aktiv, onWahl, className }) {
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
            aktiv === wert
              ? 'bg-flaeche font-semibold text-schrift shadow-sm'
              : 'text-schrift-gedimmt hover:text-schrift',
          )}>
          {text}
        </button>
      ))}
    </div>
  );
}
