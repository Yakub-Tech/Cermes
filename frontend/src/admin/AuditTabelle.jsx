import { zeitpunktAnzeigen } from './datum.js';
import { detailZeilen } from './auditDetails.js';

function benutzerText(eintrag, rollenTexte) {
  if (!eintrag.rolle) return eintrag.benutzername;
  return `${eintrag.benutzername} (${rollenTexte[eintrag.rolle] ?? eintrag.rolle})`;
}

export default function AuditTabelle({ eintraege, texte, rollenTexte }) {
  if (eintraege.length === 0) {
    return <p className="text-sm text-schrift-gedimmt">{texte.keineEintraege}</p>;
  }

  return (
    <div className="kaertchen-schatten overflow-x-auto rounded-lg border border-linie bg-flaeche">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-linie text-xs text-schrift-gedimmt">
            <th className="px-2.5 py-1.5">{texte.spalteZeit}</th>
            <th className="px-2.5 py-1.5">{texte.spalteBenutzer}</th>
            <th className="px-2.5 py-1.5">{texte.spalteAktion}</th>
            <th className="px-2.5 py-1.5">{texte.spalteDetails}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linie text-sm">
          {eintraege.map((eintrag) => (
            <tr key={eintrag.id}>
              <td className="whitespace-nowrap px-2.5 py-1.5">{zeitpunktAnzeigen(eintrag.zeitpunkt)}</td>
              <td className="whitespace-nowrap px-2.5 py-1.5">{benutzerText(eintrag, rollenTexte)}</td>
              <td className="whitespace-nowrap px-2.5 py-1.5">{texte.aktionen[eintrag.aktion] ?? eintrag.aktion}</td>
              <td className="px-2.5 py-1.5">
                {detailZeilen(eintrag.details, texte).map((zeile, index) => (
                  <div key={index}>{zeile}</div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
