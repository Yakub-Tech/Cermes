const ZEITZONE = 'Europe/Berlin';

export function formatiereDatum(datum) {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: ZEITZONE, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(datum);
}

export function formatiereUhrzeit(datum) {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: ZEITZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(datum);
}

export function berlinerJahr(datum) {
  return Number(new Intl.DateTimeFormat('de-DE', { timeZone: ZEITZONE, year: 'numeric' }).format(datum));
}
