export function schriftgroesseFuerArtikelname(name) {
  if (name.length <= 14) return 'text-[0.65rem]';
  if (name.length <= 19) return 'text-[0.55rem]';
  return 'text-[0.45rem]';
}
