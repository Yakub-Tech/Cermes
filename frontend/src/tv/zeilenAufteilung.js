export function teileInZeilen(gruppen, containerBreitePx, minBreitePx, abstandPx) {
  if (containerBreitePx <= 0 || gruppen.length === 0) {
    return { zeilen: [gruppen], jeZeile: Math.max(1, gruppen.length) };
  }

  const jeZeile = Math.max(
    1,
    Math.floor((containerBreitePx + abstandPx) / (minBreitePx + abstandPx))
  );

  const zeilen = [];
  for (let i = 0; i < gruppen.length; i += jeZeile) {
    zeilen.push(gruppen.slice(i, i + jeZeile));
  }
  return { zeilen, jeZeile };
}
