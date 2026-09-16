export function zweisprachigerName(name, nameTuerkisch, sprache) {
  return sprache === 'tr' && nameTuerkisch ? nameTuerkisch : name;
}

export function beideSprachenName(name, nameTuerkisch) {
  return nameTuerkisch ? `${name} / ${nameTuerkisch}` : name;
}
