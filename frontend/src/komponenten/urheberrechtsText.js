export const URHEBERRECHT_STARTJAHR = 2026;
export const URHEBERRECHT_KUERZEL = 'YU';

export function berechneUrheberrechtsText(startJahr, aktuellesJahr) {
  if (aktuellesJahr > startJahr) {
    return `© ${startJahr}–${aktuellesJahr} ${URHEBERRECHT_KUERZEL}`;
  }
  return `© ${startJahr} ${URHEBERRECHT_KUERZEL}`;
}
