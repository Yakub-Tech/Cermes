export const de = {
  anmeldung: 'Anmeldung',
  benutzername: 'Benutzername',
  passwort: 'Passwort',
  anmelden: 'Anmelden',
  vereinslogo: 'Vereinslogo',
  passwortAendern: 'Passwort ändern',
  aktuellesPasswort: 'Aktuelles Passwort',
  neuesPasswort: 'Neues Passwort',
  neuesPasswortWiederholen: 'Neues Passwort wiederholen',
  passwortSpeichern: 'Passwort speichern',
  zurueckZurAnmeldung: 'Zurück zur Anmeldung',
  passwoerterUngleich: 'Die beiden neuen Passwörter sind nicht gleich.',
  passwortGeaendert: 'Das Passwort wurde geändert. Bitte jetzt mit dem neuen Passwort anmelden.',
  rollenTitel: { kasse: 'Kasse', belegen: 'Belegen', ausgabe: 'Ausgabe', admin: 'Verwaltung' },
};
export const tr = {
  anmeldung: 'Giriş',
  benutzername: 'Kullanıcı adı',
  passwort: 'Şifre',
  anmelden: 'Giriş yap',
  vereinslogo: 'Dernek logosu',
  passwortAendern: 'Şifre değiştir',
  aktuellesPasswort: 'Mevcut şifre',
  neuesPasswort: 'Yeni şifre',
  neuesPasswortWiederholen: 'Yeni şifreyi tekrarla',
  passwortSpeichern: 'Şifreyi kaydet',
  zurueckZurAnmeldung: 'Girişe dön',
  passwoerterUngleich: 'İki yeni şifre aynı değil.',
  passwortGeaendert: 'Şifre değiştirildi. Lütfen şimdi yeni şifrenizle giriş yapın.',
  rollenTitel: { kasse: 'Kasa', belegen: 'Fişleme', ausgabe: 'Teslim', admin: 'Yönetim' },
};

export function inaktivHinweisDe(minuten) {
  const minutenWort = minuten === 1 ? 'Minute' : 'Minuten';
  return `Sie wurden nach ${minuten} ${minutenWort} Inaktivität automatisch abgemeldet.`;
}
export function inaktivHinweisTr(minuten) {
  return `${minuten} dakika işlem yapılmadığı için otomatik olarak çıkış yaptınız.`;
}
