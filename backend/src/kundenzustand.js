let zustand = { warenkorb: [], fokus: null };

export function kundenzustandLesen() {
  return zustand;
}

export function kundenzustandSchreiben(neuerZustand) {
  zustand = {
    warenkorb: Array.isArray(neuerZustand?.warenkorb) ? neuerZustand.warenkorb : [],
    fokus: neuerZustand?.fokus ?? null,
  };
}
