export const de = {
  anmeldung: 'Anmeldung',
  benutzername: 'Benutzername',
  passwort: 'Passwort',
  anmelden: 'Anmelden',
  vereinslogo: 'Vereinslogo',
  rollenTitel: { kasse: 'Kasse', belegen: 'Belegen', ausgabe: 'Ausgabe', admin: 'Verwaltung' },
};
export const tr = {
  anmeldung: 'Giriş',
  benutzername: 'Kullanıcı adı',
  passwort: 'Şifre',
  anmelden: 'Giriş yap',
  vereinslogo: 'Dernek logosu',
  rollenTitel: { kasse: 'Kasa', belegen: 'Fişleme', ausgabe: 'Teslim', admin: 'Yönetim' },
};

export function inaktivHinweisDe(minuten) {
  const minutenWort = minuten === 1 ? 'Minute' : 'Minuten';
  return `Sie wurden nach ${minuten} ${minutenWort} Inaktivität automatisch abgemeldet.`;
}
export function inaktivHinweisTr(minuten) {
  return `${minuten} dakika işlem yapılmadığı için otomatik olarak çıkış yaptınız.`;
}
