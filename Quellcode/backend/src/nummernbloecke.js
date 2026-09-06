const SCHWELLWERT_WARNUNG = 10;

export function pruefeBloecke(bloecke) {
  if (!Array.isArray(bloecke) || bloecke.length === 0) {
    return 'Bitte mindestens einen Nummernblock angeben.';
  }
  for (const block of bloecke) {
    if (!Number.isInteger(block.von) || block.von < 1) {
      return 'Die Von-Nummer eines Blocks muss eine ganze Zahl ab 1 sein.';
    }
    if (!Number.isInteger(block.bis) || block.bis < block.von) {
      return 'Die Bis-Nummer eines Blocks muss mindestens so groß wie die Von-Nummer sein.';
    }
  }
  const sortiert = sortiereNachVon(bloecke);
  for (let i = 1; i < sortiert.length; i += 1) {
    if (sortiert[i].von <= sortiert[i - 1].bis) {
      return 'Nummernblöcke dürfen sich nicht überschneiden.';
    }
  }
  return null;
}

export function sortiereNachVon(bloecke) {
  return [...bloecke].sort((a, b) => a.von - b.von);
}

function findeBlock(sortierteBloecke, position) {
  return sortierteBloecke.find((block) => position >= block.von && position <= block.bis) ?? null;
}

function naechsterBlockNach(sortierteBloecke, bis) {
  return sortierteBloecke.find((block) => block.von > bis) ?? null;
}

function wirksamerBlockUndPosition(sortierteBloecke, position) {
  const block = findeBlock(sortierteBloecke, position);
  if (block) return { block, position };
  const naechsterBlock = sortierteBloecke.find((b) => b.von > position) ?? null;
  if (naechsterBlock) return { block: naechsterBlock, position: naechsterBlock.von };
  return { block: null, position };
}

export function ermittleVergabeUndNeuePosition(sortierteBloecke, position) {
  const { block, position: wirksamePosition } = wirksamerBlockUndPosition(sortierteBloecke, position);
  if (!block || wirksamePosition < block.bis) {
    return { nummer: wirksamePosition, neuePosition: wirksamePosition + 1 };
  }
  const naechsterBlock = naechsterBlockNach(sortierteBloecke, block.bis);
  return { nummer: wirksamePosition, neuePosition: naechsterBlock ? naechsterBlock.von : wirksamePosition + 1 };
}

export function ermittleStatus(sortierteBloecke, position) {
  const { block, position: wirksamePosition } = wirksamerBlockUndPosition(sortierteBloecke, position);
  if (!block) {
    return {
      status: 'aufgebraucht', verbleibend: 0, blockBis: null, naechsterBlock: null,
    };
  }
  const verbleibend = block.bis - wirksamePosition + 1;
  const naechsterBlock = naechsterBlockNach(sortierteBloecke, block.bis);
  if (verbleibend > SCHWELLWERT_WARNUNG) {
    return {
      status: 'ok', verbleibend, blockBis: block.bis, naechsterBlock,
    };
  }
  return {
    status: naechsterBlock ? 'block_wechseln' : 'block_eintragen',
    verbleibend, blockBis: block.bis, naechsterBlock,
  };
}

export function hinweisText(status, { verbleibend, blockBis, naechsterBlock } = {}) {
  if (status === 'block_wechseln') {
    return `Nur noch ${verbleibend} Kärtchen in diesem Nummernblock (bis Nummer ${blockBis}). `
      + `Kärtchen für die Nummern ${naechsterBlock.von} bis ${naechsterBlock.bis} bereitlegen.`;
  }
  if (status === 'block_eintragen') {
    return `Nur noch ${verbleibend} Kärtchen in diesem Nummernblock (bis Nummer ${blockBis}), `
      + 'kein weiterer Nummernblock eingetragen. Admin Bescheid geben, neuen Nummernblock eintragen.';
  }
  if (status === 'aufgebraucht') {
    return 'Kein gültiger Nummernblock mehr vorhanden. Es wird ungeprüft weitergezählt, bitte sofort einen neuen Nummernblock eintragen.';
  }
  return null;
}
