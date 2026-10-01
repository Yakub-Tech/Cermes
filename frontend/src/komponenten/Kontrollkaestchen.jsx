import * as Checkbox from '@radix-ui/react-checkbox';

export default function Kontrollkaestchen({ markiert, onWahl, groesse = 'h-4 w-4', rand = 'border-linie' }) {
  return (
    <Checkbox.Root checked={markiert} onCheckedChange={onWahl}
      className={`flex ${groesse} shrink-0 cursor-pointer items-center justify-center rounded-md border ${rand} bg-flaeche outline-none focus:ring-2 focus:ring-blau-hell/40 data-[state=checked]:border-blau data-[state=checked]:bg-blau`}>
      <Checkbox.Indicator className="haekchen-indicator animate-[haekchen-einblenden_100ms_ease-out] text-flaeche">
        ✓
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}
