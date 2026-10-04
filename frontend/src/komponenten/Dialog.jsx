import { useEffect, useRef } from 'react';

export default function Dialog({ titel, kinder, children, onSchliessen, breite = 'max-w-sm' }) {
  const dialogRef = useRef(null);
  const ausloeserRef = useRef(document.activeElement);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    dialogElement.showModal();
    return () => {
      if (dialogElement.open) dialogElement.close();
      const ausloeser = ausloeserRef.current;
      if (ausloeser.isConnected) ausloeser.focus();
    };
  }, []);

  function escapeGedrueckt(ereignis) {
    ereignis.preventDefault();
    onSchliessen();
  }

  return (
    <dialog ref={dialogRef} onCancel={escapeGedrueckt} onClick={onSchliessen}
      className="fixed inset-0 m-0 flex h-full max-h-none w-full max-w-none items-center
        justify-center bg-transparent p-2.5 text-schrift backdrop:bg-black/60">
      <div className={`max-h-[90vh] w-full ${breite} overflow-y-auto rounded-lg border border-linie
          bg-flaeche p-4 shadow-[0_8px_30px_var(--schattenfarbe)]`}
        onClick={(ereignis) => ereignis.stopPropagation()}>
        {titel && <h2 className="mb-2.5 font-display text-base font-semibold tracking-tight text-schrift">{titel}</h2>}
        {kinder ?? children}
      </div>
    </dialog>
  );
}
