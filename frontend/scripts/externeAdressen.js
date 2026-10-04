const ERLAUBT = [
  /^(https?:)?\/\/www\.w3\.org\//,
  /^(https?:)?\/\/localhost(:\d+)?(\/|$)/,
  /^(https?:)?\/\/127\.0\.0\.1(:\d+)?(\/|$)/,
];

const ERLAUBT_NUR_IM_JS = [
  /^(https?:)?\/\/reactjs\.org(\/|$)/,
  /^(https?:)?\/\/(purl\.org|schemas\.microsoft\.com|schemas\.openxmlformats\.org|ns\.adobe\.com|www\.aiim\.org)(\/|$)/,
  /^(https?:)?\/\/github\.com\/(crypto-browserify|exceljs|indutny|uuidjs|zloirock)\//,
  /^(https?:)?\/\/stuk\.github\.io\/jszip\//,
  /^(https?:)?\/\/tools\.ietf\.org\/html\/rfc/,
  /^(https?:)?\/\/fb\.me\/use-check-prop-types(\/|$|#)/,
  /^http:\/\/\$\{/,
  /^(https?:)?\/\/192\.168\.1\.50(:\d+)?(\/|$)/,
];

export function externeAdressenFinden(text, { istJs = false } = {}) {
  const ohneKommentare = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  const muster = istJs
    ? /(?<=^|[\s"'`(=])\/\/[\w-]+(?:\.[\w-]+)+[^\s"'`()<>]*|https?:\/\/[^\s"'`()<>]+/g
    : /(?<=^|[\s"'(=])(?:https?:)?\/\/[^\s"'`()<>]+|https?:\/\/[^\s"'`()<>]+/g;
  const adressen = ohneKommentare.match(muster) ?? [];
  const erlaubt = istJs ? [...ERLAUBT, ...ERLAUBT_NUR_IM_JS] : ERLAUBT;
  const extern = adressen.filter((adresse) => !erlaubt.some((erlaubtesMuster) => erlaubtesMuster.test(adresse)));
  return [...new Set(extern)].sort();
}
