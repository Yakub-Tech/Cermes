const FRIST_OHNE_NACHRICHT_MS = 40000;
const WARTEZEIT_WIEDERVERBINDEN_MS = 2000;

export function erstelleLiveVerbindung(socketErzeugen) {
  const abonnenten = new Set();
  const statusHoerer = new Set();
  let socket = null;
  let verbunden = false;
  let wiederholung = null;
  let frist = null;

  function statusSetzen(neu) {
    if (verbunden === neu) return;
    verbunden = neu;
    for (const hoerer of statusHoerer) hoerer(verbunden);
  }

  function socketVerwerfen() {
    clearTimeout(frist);
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.close();
    socket = null;
  }

  function verbindungVerloren() {
    socketVerwerfen();
    statusSetzen(false);
    clearTimeout(wiederholung);
    wiederholung = setTimeout(verbinden, WARTEZEIT_WIEDERVERBINDEN_MS);
  }

  function fristNeuStarten() {
    clearTimeout(frist);
    frist = setTimeout(verbindungVerloren, FRIST_OHNE_NACHRICHT_MS);
  }

  function verbinden() {
    wiederholung = null;
    socket = socketErzeugen();
    socket.onopen = () => {
      fristNeuStarten();
      statusSetzen(true);
      for (const abonnent of [...abonnenten]) abonnent.callback();
    };
    socket.onmessage = (nachricht) => {
      fristNeuStarten();
      const { typ } = JSON.parse(nachricht.data);
      for (const abonnent of [...abonnenten]) {
        if (abonnent.typen.includes(typ)) abonnent.callback();
      }
    };
    socket.onclose = verbindungVerloren;
  }

  function beendenFallsUnbenutzt() {
    if (abonnenten.size > 0 || statusHoerer.size > 0) return;
    clearTimeout(wiederholung);
    wiederholung = null;
    socketVerwerfen();
    statusSetzen(false);
  }

  function starteFallsNoetig() {
    if (socket === null && wiederholung === null) verbinden();
  }

  return {
    abonnieren(typen, callback) {
      const abonnent = { typen, callback };
      abonnenten.add(abonnent);
      starteFallsNoetig();
      if (verbunden) callback();
      return () => {
        abonnenten.delete(abonnent);
        beendenFallsUnbenutzt();
      };
    },
    statusAbonnieren(hoerer) {
      statusHoerer.add(hoerer);
      starteFallsNoetig();
      return () => {
        statusHoerer.delete(hoerer);
        beendenFallsUnbenutzt();
      };
    },
    istVerbunden() {
      return verbunden;
    },
  };
}
