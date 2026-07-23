import WerbeSlot from './WerbeSlot.jsx';
import WerbeBand from './WerbeBand.jsx';

export default function WerbeLeiste({ bilder }) {
  if (bilder.length <= 3) {
    return bilder.map((bild) => <WerbeSlot key={bild.id} bild={bild} />);
  }

  return <WerbeBand bilder={bilder} />;
}
