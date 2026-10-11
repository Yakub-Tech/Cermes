export function schriftgroesseFuerArtikelname(name) {
  if (name.length <= 14) return 'text-[0.8rem]';
  if (name.length <= 19) return 'text-[0.58rem]';
  return 'text-[0.46rem]';
}
