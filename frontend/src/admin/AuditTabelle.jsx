import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/komponenten/ui/table';
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
    <Table className="min-w-[640px]">
      <TableHeader>
        <TableRow>
          <TableHead className="py-1.5">{texte.spalteZeit}</TableHead>
          <TableHead className="py-1.5">{texte.spalteBenutzer}</TableHead>
          <TableHead className="py-1.5">{texte.spalteAktion}</TableHead>
          <TableHead className="py-1.5">{texte.spalteDetails}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {eintraege.map((eintrag) => (
          <TableRow key={eintrag.id}>
            <TableCell className="py-1.5 whitespace-nowrap">{zeitpunktAnzeigen(eintrag.zeitpunkt)}</TableCell>
            <TableCell className="py-1.5 whitespace-nowrap">{benutzerText(eintrag, rollenTexte)}</TableCell>
            <TableCell className="py-1.5 whitespace-nowrap">{texte.aktionen[eintrag.aktion] ?? eintrag.aktion}</TableCell>
            <TableCell className="py-1.5">
              {detailZeilen(eintrag.details, texte).map((zeile, index) => (
                <div key={index}>{zeile}</div>
              ))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
