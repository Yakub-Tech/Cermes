import logo from '../design/logo.png';
import WerbeSlot from './WerbeSlot.jsx';

const ROTATIONS_VERSATZ_MS = 500;

export default function WerbeLeiste({ bilder }) {
  if (bilder.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-2">
        <img src={logo} alt="Vereinslogo"
          className="max-h-full max-w-full object-contain opacity-80" />
      </div>
    );
  }

  if (bilder.length === 1) {
    return <WerbeSlot bilder={bilder} startIndex={0} />;
  }

  if (bilder.length === 2) {
    return (
      <>
        <WerbeSlot bilder={[bilder[0]]} startIndex={0} />
        <WerbeSlot bilder={[bilder[1]]} startIndex={0} />
      </>
    );
  }

  return (
    <>
      <WerbeSlot bilder={bilder} startIndex={0} />
      <WerbeSlot bilder={bilder} startIndex={1} startVerzoegerungMs={ROTATIONS_VERSATZ_MS} />
    </>
  );
}
