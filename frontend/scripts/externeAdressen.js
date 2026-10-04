const ERLAUBT = [
  /^(https?:)?\/\/www\.w3\.org\//,
  /^(https?:)?\/\/localhost(:\d+)?(\/|$)/,
  /^(https?:)?\/\/127\.0\.0\.1(:\d+)?(\/|$)/,
];

export function externeAdressenFinden(text) {
  const ohneKommentare = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  const adressen = ohneKommentare.match(/(?<=^|[\s"'(=])(?:https?:)?\/\/[^\s"'()<>]+|https?:\/\/[^\s"'()<>]+/g) ?? [];
  const extern = adressen.filter((adresse) => !ERLAUBT.some((muster) => muster.test(adresse)));
  return [...new Set(extern)].sort();
}
