import logo from '../design/logo.png';
import WerbeSlot from './WerbeSlot.jsx';
import WerbeBand from './WerbeBand.jsx';

export default function WerbeLeiste({ bilder }) {
  if (bilder.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-2">
        <img src={logo} alt="Vereinslogo"
          className="max-h-full max-w-full object-contain opacity-80" />
      </div>
    );
  }

  if (bilder.length <= 3) {
    return bilder.map((bild) => <WerbeSlot key={bild.id} bild={bild} />);
  }

  return <WerbeBand bilder={bilder} />;
}
