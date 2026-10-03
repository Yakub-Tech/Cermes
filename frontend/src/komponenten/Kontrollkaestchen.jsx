import * as Checkbox from '@radix-ui/react-checkbox';

export default function Kontrollkaestchen({ markiert, onWahl, groesse = 'h-4 w-4', rand = 'border-linie' }) {
  return (
    <Checkbox.Root checked={markiert} onCheckedChange={onWahl}
      className={`flex ${groesse} shrink-0 cursor-pointer items-center justify-center rounded-md border ${rand} bg-flaeche-hell outline-none focus-visible:ring-3 focus-visible:ring-schrift/10 data-[state=checked]:border-haupt data-[state=checked]:bg-haupt`}>
      <Checkbox.Indicator className="haekchen-indicator animate-[haekchen-einblenden_100ms_ease-out] text-haupt-text">
        ✓
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}
