import * as Checkbox from '@radix-ui/react-checkbox';

export default function Kontrollkaestchen({ markiert, onWahl }) {
  return (
    <Checkbox.Root checked={markiert} onCheckedChange={onWahl}
      className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-linie bg-flaeche outline-none focus:ring-2 focus:ring-blau-hell/40 data-[state=checked]:border-blau data-[state=checked]:bg-blau">
      <Checkbox.Indicator className="haekchen-indicator animate-[haekchen-einblenden_100ms_ease-out] text-flaeche">
        ✓
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}
