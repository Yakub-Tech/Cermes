export function minutenSeit(iso, jetzt) {
  return Math.floor((jetzt - new Date(iso).getTime()) / 60000);
}

export function alterText(iso, jetzt) {
  const minuten = minutenSeit(iso, jetzt);
  if (minuten < 1) return 'gerade eben';
  return `vor ${minuten} min`;
}
