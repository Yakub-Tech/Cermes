export function formatiereBerlinerZeit(datum) {
  const teile = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(datum);
  const wert = (typ) => teile.find((teil) => teil.type === typ).value;

  return `${wert('year')}-${wert('month')}-${wert('day')}` +
    `T${wert('hour')}:${wert('minute')}:${wert('second')}${berlinVersatz(datum)}`;
}

function berlinVersatz(datum) {
  const teile = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'longOffset',
  }).formatToParts(datum);
  return teile.find((teil) => teil.type === 'timeZoneName').value.replace('GMT', '');
}

export function jetztIso() {
  return formatiereBerlinerZeit(new Date());
}

export function heutigesDatum() {
  return jetztIso().slice(0, 10);
}
