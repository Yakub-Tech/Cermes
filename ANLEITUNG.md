# Cermes: Anleitung

## Einrichten

1. Docker Desktop installieren (https://www.docker.com/products/docker-desktop/) und einmal starten.
2. Im Cermes-Ordner die Datei `.env.beispiel` kopieren und die Kopie `.env` nennen. Öffne
   `.env` mit dem Editor und schreibe hinter `CERMES_EINRICHTUNGSKENNWORT=` ein eigenes
   Kennwort, ohne Leerzeichen und Anführungszeichen. Speichern.
3. `Cermes-Starten.bat` doppelklicken. Beim ersten Mal dauert es einige Minuten und es
   braucht Internet. Danach öffnet sich der Browser.
4. Bei der Ersteinrichtung das Einrichtungskennwort eingeben und das erste Admin-Konto
   anlegen (Passwort mindestens 8 Zeichen). Das Passwort gut aufbewahren, es gibt keinen
   Zurücksetzen-Knopf für den Admin.
5. Im Admin unter Benutzer für jede Person ein eigenes Konto mit passender Rolle anlegen.
6. Unter Beilagen und Artikel die Speisen eintragen. Fehlt ein Artikel am Verkaufstag,
   auf inaktiv stellen.

## Die Rollen

- admin: darf alles, auch Benutzer, Einstellungen, Backup und Protokoll
- kasse: kassiert und storniert (`/kasse`)
- belegen: setzt Kärtchen auf abholbereit (`/belegen`)
- ausgabe: gibt abholbereite Kärtchen an die Kunden aus (`/ausgabe`)
- verwaltung: pflegt Artikel, Beilagen und Werbung und sieht die Statistik, aber keine
  Geldbeträge und keine Einkaufspreise (`/admin`)

## Geräte verbinden

Alle Geräte müssen im selben WLAN sein wie der Cermes-Computer. Seine Adresse steht
unten rechts auf der Startseite, mit QR-Code. Dann im Browser öffnen (Beispiel):

- Kasse: `http://192.168.1.50:8080/kasse`
- Belegen: `http://192.168.1.50:8080/belegen`
- Ausgabe: `http://192.168.1.50:8080/ausgabe`
- Admin: `http://192.168.1.50:8080/admin`

Die Kasse ist für Tablet oder Computer gedacht, nicht für das Handy.

## TV-Anzeige

Auf dem Fernseher im Browser `/tv` öffnen und mit F11 in den Vollbildmodus gehen. Sie
braucht keine Anmeldung und aktualisiert sich selbst. Die Kundenanzeige für einen
zweiten Bildschirm an der Kasse liegt unter `/kunde`. Das Aussehen der TV-Anzeige
(dunkel oder hell) stellt der Admin unter Einstellungen ein.

## Verkaufstag

Vorher: Cermes starten und alle Geräte anmelden. Im Admin prüfen, ob die Startnummer
jedes Artikels zur echten Kärtchenrolle passt, sonst bei "Weiter bei Nummer" korrigieren.

An der Kasse: Artikel antippen, gegebenenfalls Beilagen ankreuzen, Kunde zahlt, dann
"Kassieren". Die Nummern erscheinen groß. Dem Kunden die passenden Kärtchen geben und
"Fertig" drücken. Erst dann ist der Verkauf gebucht. Mit "Zurück" lässt sich vorher noch
etwas ändern.

Rückgabe: An der Kasse im Reiter Storno die Nummer suchen und bestätigen. Geld zurückgeben
und das Kärtchen wegwerfen. Die Nummer wird nie wieder benutzt. Das geht nur, solange das
Essen nicht abgeholt wurde.

Belegen: Ist ein Kärtchen fertig belegt, antippen. Es wandert zu "Abholbereit".

Ausgabe: Holt der Kunde sein Essen ab, das Kärtchen antippen. Zu lange wartende Kärtchen
leuchten auf. Dann die Nummer laut ausrufen. Bei einer Fehlbedienung sofort "Rückgängig".

Nachher: Im Admin unter Backup "Backup herunterladen" und die Datei auf einen USB-Stick
legen. Das bitte nach jedem Verkaufstag machen. Dann `Cermes-Beenden.bat` doppelklicken.

## Passwort ändern

Auf der Anmeldeseite auf "Passwort ändern" tippen, Benutzername, altes und neues Passwort
eingeben. Danach mit dem neuen Passwort anmelden. Vergisst jemand sein Passwort, setzt der
Admin es unter Benutzer neu.

## Datensicherung

Alles liegt im Ordner `data` im Cermes-Ordner: Bestellungen, Statistik, Bilder, Konten.
Den Ordner nie löschen oder umbenennen. Zum Kopieren Cermes vorher mit `Cermes-Beenden.bat`
beenden und den ganzen Ordner kopieren. Einfacher ist der Backup-Knopf im Admin. Dort
lässt sich ein Backup auch wieder einspielen.

## Probleme

- Seite lädt auf dem Tablet oder TV nicht: Ist das Gerät im selben WLAN? Die Adresse kann
  sich ändern, aktuelle Adresse auf der Startseite nachsehen.
- Cermes reagiert nicht: im Cermes-Ordner `docker compose restart`. Die Daten bleiben erhalten.
- `Cermes-Starten.bat` meldet einen Docker-Fehler: Docker Desktop von Hand starten, warten
  bis es bereit ist, dann die Datei noch einmal doppelklicken.
- "Zu viele falsche Anmeldeversuche": 30 Sekunden warten und noch einmal probieren.
- Ersteinrichtung ist gesperrt: Die Datei `.env` fehlt oder das Kennwort ist leer. Eintragen
  und im Cermes-Ordner `docker compose up -d` ausführen.
