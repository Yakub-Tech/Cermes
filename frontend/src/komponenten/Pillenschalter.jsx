import { cn } from '@/hilfen/utils';

const AN_FARBEN = {
  erfolg: 'bg-erfolg text-white',
  gefahr: 'bg-gefahr text-white',
  haupt: 'bg-haupt text-haupt-text',
};

export default function Pillenschalter({ an, art = 'erfolg', onClick, className, children }) {
  const farbe = an
    ? `border-transparent ${AN_FARBEN[art]}`
    : 'border-linie text-schrift-gedimmt hover:bg-flaeche-hell';

  return (
    <button type="button" onClick={onClick}
      className={cn('cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold', farbe, className)}>
      {children}
    </button>
  );
}
