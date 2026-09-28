import { useRef, useState } from 'react';
import * as Select from '@radix-ui/react-select';

const LEER_TOKEN = '__leer__';

export default function Auswahlmenue({ wert, onWahl, optionen, klasse = 'text-sm' }) {
  const radixWert = wert === '' ? LEER_TOKEN : String(wert);
  const textGroesse = klasse.split(' ').filter((teil) => teil.startsWith('text-')).join(' ');
  const triggerRef = useRef(null);
  const [portalContainer, setPortalContainer] = useState(undefined);

  function triggerRefGesetzt(knoten) {
    triggerRef.current = knoten;
    if (knoten) {
      setPortalContainer(knoten.closest('dialog') ?? knoten.closest('.verwaltung') ?? undefined);
    }
  }

  function wahlGeaendert(neuerWert) {
    onWahl(neuerWert === LEER_TOKEN ? '' : neuerWert);
  }

  return (
    <Select.Root value={radixWert} onValueChange={wahlGeaendert}>
      <Select.Trigger ref={triggerRefGesetzt}
        className={`group inline-flex cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-linie bg-flaeche px-2 py-1.5 text-left outline-none focus:ring-2 focus:ring-blau-hell/40 data-[state=open]:ring-2 data-[state=open]:ring-blau-hell/40 ${klasse}`}>
        <Select.Value />
        <Select.Icon className="auswahlmenue-chevron text-schrift-gedimmt transition-transform duration-150 group-data-[state=open]:rotate-180">
          ▾
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Content position="popper" sideOffset={4}
          className={`auswahlmenue-panel z-50 overflow-hidden rounded-lg border border-linie bg-flaeche shadow-2xl data-[state=open]:animate-[dropdown-oeffnen_120ms_ease-out] ${textGroesse}`}>
          <Select.Viewport className="max-h-72 p-1">
            {optionen.map((option) => {
              const optionWert = option.wert === '' ? LEER_TOKEN : String(option.wert);
              return (
                <Select.Item key={optionWert} value={optionWert}
                  className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 outline-none data-[highlighted]:bg-flaeche-hell data-[state=checked]:bg-flaeche-hell">
                  <Select.ItemText>{option.text}</Select.ItemText>
                  <Select.ItemIndicator className="text-blau">✓</Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
