import { memo } from 'react';
import WerbeSlot from './WerbeSlot.jsx';
import WerbeBand from './WerbeBand.jsx';

function WerbeLeiste({ bilder }) {
  if (bilder.length <= 3) {
    return bilder.map((bild) => <WerbeSlot key={bild.id} bild={bild} />);
  }

  return <WerbeBand bilder={bilder} />;
}

export default memo(WerbeLeiste);
