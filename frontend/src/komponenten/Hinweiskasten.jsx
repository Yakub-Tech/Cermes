import { cn } from '@/hilfen/utils';

const ARTEN = {
  fehler: 'border-gefahr/30 bg-gefahr/15 text-gefahr-schrift',
  warnung: 'border-gefahr/30 bg-gefahr/15 text-gefahr-schrift',
  erfolg: 'border-erfolg/30 bg-erfolg/15 text-erfolg-schrift',
  info: 'border-linie bg-flaeche-hell text-schrift-gedimmt',
};

const ROLLEN = { fehler: 'alert', warnung: 'note', erfolg: 'status', info: 'status' };

export default function Hinweiskasten({ art = 'info', className, children }) {
  return (
    <div role={ROLLEN[art]} className={cn('rounded-lg border px-3 py-2', ARTEN[art], className)}>
      {children}
    </div>
  );
}
