export function dateiHerunterladen(blob, dateiname) {
  const adresse = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = adresse;
  link.download = dateiname;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(adresse);
}
