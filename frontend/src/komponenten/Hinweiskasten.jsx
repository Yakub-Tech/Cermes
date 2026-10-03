import { cn } from '@/hilfen/utils';

const ARTEN = {
  fehler: 'border-gefahr/30 bg-gefahr/15 text-gefahr-schrift',
  info: 'border-linie bg-flaeche-hell text-schrift-gedimmt',
};

export default function Hinweiskasten({ art = 'info', className, children }) {
  return (
    <p role={art === 'fehler' ? 'alert' : 'status'}
      className={cn('rounded-lg border px-3 py-2', ARTEN[art], className)}>
      {children}
    </p>
  );
}
