function sindBeilagenGleich(a, b) {
  if (a.length !== b.length) return false;
  const idsA = a.map((beilage) => beilage.id).sort();
  const idsB = b.map((beilage) => beilage.id).sort();
  return idsA.every((id, index) => id === idsB[index]);
}

function findePassendePosition(positionen, artikel, beilagen, sonderwunsch) {
  return positionen.find((position) =>
    position.artikel.id === artikel.id
    && sindBeilagenGleich(position.beilagen, beilagen)
    && position.sonderwunsch === sonderwunsch
  );
}

export function positionHinzufuegen(positionen, artikel, beilagen, naechsterSchluessel, sonderwunsch = '') {
  const bestehende = findePassendePosition(positionen, artikel, beilagen, sonderwunsch);
  if (bestehende) {
    return positionen.map((position) =>
      position === bestehende ? { ...position, menge: position.menge + 1 } : position
    );
  }
  return [...positionen, { schluessel: naechsterSchluessel(), artikel, beilagen, sonderwunsch, menge: 1 }];
}

export function mengeAendern(positionen, schluessel, delta) {
  return positionen
    .map((position) =>
      position.schluessel === schluessel ? { ...position, menge: position.menge + delta } : position
    )
    .filter((position) => position.menge > 0);
}

export function positionenFuerApi(positionen) {
  const eintraege = [];
  for (const position of positionen) {
    for (let i = 0; i < position.menge; i += 1) {
      eintraege.push({
        artikel_id: position.artikel.id,
        beilagen_ids: position.beilagen.map((beilage) => beilage.id),
        sonderwunsch: position.sonderwunsch,
      });
    }
  }
  return eintraege;
}
