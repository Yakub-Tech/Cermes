import * as Checkbox from '@radix-ui/react-checkbox';

export default function Kontrollkaestchen({ markiert, onWahl, groesse = 'h-[16px] w-[16px]', rand = 'border-feldrahmen' }) {
  return (
    <Checkbox.Root checked={markiert} onCheckedChange={onWahl}
      className={`relative flex ${groesse} shrink-0 cursor-pointer items-center justify-center rounded-[3px] border ${rand} bg-flaeche-hell outline-none after:absolute after:-inset-[5px] after:content-[''] focus-visible:ring-3 focus-visible:ring-schrift/10 data-[state=checked]:border-haupt data-[state=checked]:bg-haupt`}>
      <Checkbox.Indicator className="haekchen-indicator animate-[haekchen-einblenden_100ms_ease-out] text-haupt-text">
        ✓
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}
