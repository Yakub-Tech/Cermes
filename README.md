# Cermes

Cermes ist ein Verkaufssystem für Vereinsfeste im lokalen Netzwerk. An der Kasse wird
der Verkauf erfasst, jede Portion bekommt ein nummeriertes Kärtchen. Die Kärtchen werden
belegt und an der Ausgabe abgeholt, ein Fernseher zeigt den Kunden den aktuellen Stand.
Alles läuft in einem Docker-Container und braucht im Betrieb kein Internet.

## Funktionen

- Kasse mit Artikeln, Beilagen, Warenkorb und Storno
- Eigener Nummernkreis pro Artikel
- Belegen und Ausgabe der Kärtchen mit Live-Aktualisierung
- TV-Anzeige mit Werbekarussell und Kundenanzeige an der Kasse
- Statistik mit Umsatz und Gewinn, Export als Excel und PDF
- Verwaltung von Artikeln, Beilagen, Werbung, Benutzern und Einstellungen
- Backup als ZIP herunterladen und wieder einspielen
- Oberfläche auf Deutsch und Türkisch, dunkles und helles Design

## Voraussetzungen

- Docker Desktop (für den Betrieb)
- Node.js 22 (nur für die Entwicklung und die Tests)

## Starten

1. `.env.beispiel` nach `.env` kopieren und hinter `CERMES_EINRICHTUNGSKENNWORT=` ein
   eigenes Kennwort eintragen. Ohne Kennwort bleibt die Ersteinrichtung gesperrt.
2. Unter Windows `Cermes-Starten.bat` doppelklicken. Sonst im Projektordner:

   ```
   docker compose up -d --build
   ```

3. `http://localhost:8080` öffnen und das erste Admin-Konto anlegen.

Beenden: `Cermes-Beenden.bat` oder `docker compose down`. Die Daten bleiben im Ordner `data`.

## Tests

```
cd backend && npm install && npm test
cd frontend && npm install && npm test
cd frontend && npm run pruefe-offline
```

Entwicklung: `cd backend && npm start` (Port 8080) und `cd frontend && npm run dev`
(Port 5173, leitet auf 8080 weiter).

## Ordner

- `backend/`: Express-Server, SQLite-Datenbank, Migrationen, Tests
- `frontend/`: React-Oberfläche (Kasse, Belegen, Ausgabe, TV, Kunde, Admin)
- `assets/`: Vereinslogo
- `data/`: Datenbank, Bilder, Session-Geheimnis (wird beim ersten Start angelegt, nicht im Git)

Bedienung: siehe [ANLEITUNG.md](ANLEITUNG.md).
