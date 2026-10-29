# rucksack.

Packliste mit Gewichtssummen und Basisgewicht, offline und ohne Konto.

## Problem

Wer wandert, mit dem Rad auf Tour geht oder leicht reisen will, plant seine Ausrüstung als Liste mit Gewichten. Heute geht das über Webdienste mit Konto (LighterPack, Packstack) oder über Apps, die Geld kosten oder Abos und In-App-Käufe haben (PackPoint Premium, Packing Pro, PackLight). Was stört: die Liste liegt auf fremden Servern, ohne Netz kommt man im Gelände nicht dran, und die Daten lassen sich oft nicht sauber als Datei mitnehmen. Gebraucht wird eigentlich wenig: Gegenstände mit Gewicht, Kategorien, die Trennung in Basis-, getragenes und Verbrauchsgewicht, Listen wiederverwenden und als Datei sichern.

## Zielgruppe

Wanderer, Trekker, Bikepacker und Leichtreisende, die ihr Basisgewicht kennen und senken wollen. Auch Leute, die nur eine wiederverwendbare Packliste mit Abhaken wollen. Nutzung vor allem am Handy, Planung gern auch am Rechner.

## Vorbild und Abgrenzung

- **PackPoint Premium** und **Packing Pro**: bezahlte Packlisten-Apps (Einmalkauf im niedrigen Euro-Bereich, Preise je Store verschieden), mit Vorlagen und Abhaken, Gewichte sind dort Nebensache.
- **LighterPack**: der Standard der Leichtgewicht-Szene, kostenlos und quelloffen, aber Webdienst mit Konto und Server, offline nicht nutzbar.
- **Packstack**: offen, läuft mit Server und Webkonto, Offline-Betrieb nicht belegt.
- **PackLight, GearsLib** und ähnliche: offline, aber proprietär, teils mit Abo.

rucksack. macht den Kern von LighterPack als installierbare PWA: alles auf dem Gerät, kein Konto, Export und Import als Datei, Import von LighterPack-CSV für den Umzug. Keine Vorlagen-Automatik nach Reiseziel und kein Wetter wie bei PackPoint.

## Funktionen v1

- Mehrere Listen anlegen, umbenennen, löschen, **duplizieren** (Wiederverwendung für die nächste Tour).
- Kategorien pro Liste (frei benennbar, sortierbar per Hoch/Runter-Knopf).
- Einträge: Name, Gewicht in Gramm (Eingabe auch in kg, oz, lb, intern immer Gramm), Anzahl, Art (`basis`, `getragen`, `verbrauch`), Notiz, Haken `gepackt`.
- Summen live: gesamt, getragen, Verbrauch, Rucksackgewicht, **Basisgewicht**, je Kategorie mit Anteil in Prozent und einfachem Balken.
- Anzeigeeinheit wählbar: g, kg, oz, lb.
- Packmodus: Liste zum Abhaken, Haken zurücksetzen mit einem Knopf.
- Export und Import als JSON-Datei (alle Listen oder eine Liste). Import von LighterPack-CSV als neue Liste.
- Beispielliste (als `Beispiel` markiert, mit einem Klick entfernbar).

## Nicht-Ziele

- Kein Konto, kein Sync, kein Teilen per Link, kein Server.
- Keine Ausrüstungsdatenbank mit Herstellergewichten, keine Preise, keine Shop-Links.
- Keine automatischen Vorschläge nach Ziel, Wetter oder Dauer.
- Keine Bilder zu Einträgen.
- Kein CSV-Export im LighterPack-Format in v1 (nur Import).
- Keine Aufteilung „ein Stück getragen, Rest im Rucksack“: die Art gilt für den ganzen Eintrag. Wer das braucht, legt zwei Einträge an.

## Daten und Format

Speicher: `localStorage`, ein Schlüssel `rucksack.v1` mit dem ganzen Zustand als JSON. Einstellungen (Einheit, Theme) unter `rucksack.einstellungen`.

```json
{
  "format": "rucksack",
  "version": 1,
  "listen": [
    {
      "id": "l1", "name": "Wochenende Mittelgebirge", "notiz": "",
      "beispiel": false, "erstellt": "2026-10-29T10:00:00Z", "geaendert": "2026-10-29T10:00:00Z",
      "kategorien": [ { "id": "k1", "name": "Schlafen" } ],
      "eintraege": [
        { "id": "e1", "kategorie": "k1", "name": "Zelt", "gewicht_g": 1200,
          "anzahl": 1, "art": "basis", "gepackt": false, "notiz": "" }
      ]
    }
  ]
}
```

- `gewicht_g`: ganze Zahl ≥ 0, Gramm. Eingaben in anderen Einheiten werden beim Speichern auf ganze Gramm gerundet.
- `anzahl`: ganze Zahl 0 bis 999. 0 heißt: steht auf der Liste, kommt diesmal nicht mit, zählt nicht.
- `art`: genau einer der Werte `basis`, `getragen`, `verbrauch`.
- IDs: zufällige Zeichenketten (`crypto.randomUUID`, sonst Zeit plus Zufall).
- Import prüft `format` und `version`, verwirft ungültige Einträge mit Meldung, überschreibt nichts ungefragt: importierte Listen kommen als neue Listen dazu (bei gleicher ID neue ID).
- Exportdatei: `rucksack-JJJJ-MM-TT.json`.
- **LighterPack-CSV-Import**: Kopfzeile mit den Spalten `Item Name, Category, desc, qty, weight, unit, url, price, worn, consumable`. Spaltenzuordnung über den Kopf, nicht über die Position. `unit` aus `g`, `kg`, `oz`, `lb`. `worn` bzw. `consumable` gelten als gesetzt, wenn das Feld nicht leer und nicht `0` oder `false` ist. Hat ein Eintrag beides, gewinnt `verbrauch`. `url` und `price` werden ignoriert, `desc` wird zur Notiz. CSV mit Anführungszeichen und Kommas im Feld muss gehen.

## Rechenlogik

Reine Funktionen in `rechnen.js`, ohne DOM.

- `zeilengewicht(e) = e.gewicht_g × e.anzahl`
- `gesamt = Σ zeilengewicht` über alle Einträge
- `getragen = Σ zeilengewicht` mit `art = getragen`
- `verbrauch = Σ zeilengewicht` mit `art = verbrauch`
- `rucksackgewicht = gesamt − getragen` (was auf dem Rücken liegt, inklusive Verbrauch)
- `basisgewicht = gesamt − getragen − verbrauch`
- Je Kategorie: Summe und Anteil `summe / gesamt × 100`, auf ganze Prozent gerundet (bei `gesamt = 0` Anteil 0). Die gerundeten Anteile müssen nicht exakt 100 ergeben, das wird nicht kaschiert.
- Einheiten: 1 oz = 28,349523125 g, 1 lb = 453,59237 g. Anzeige: g ganzzahlig, kg mit zwei Nachkommastellen, oz mit einer, lb mit zwei. Deutsches Dezimalkomma.
- `zuGramm(wert, einheit)` rundet kaufmännisch auf ganze Gramm.

**Testvektor 1** (eine Liste):

| Eintrag | Kategorie | Gewicht | Anzahl | Art |
|---|---|---|---|---|
| Zelt | Schlafen | 1200 g | 1 | basis |
| Schlafsack | Schlafen | 800 g | 1 | basis |
| Wasser | Proviant | 1000 g | 2 | verbrauch |
| Essen pro Tag | Proviant | 500 g | 3 | verbrauch |
| Schuhe | Kleidung | 900 g | 1 | getragen |
| Jacke | Kleidung | 350 g | 1 | getragen |
| Stuhl | Lager | 450 g | 0 | basis |

Erwartet: gesamt 6750 g, getragen 1250 g, verbrauch 3500 g, rucksackgewicht 5500 g, basisgewicht 2000 g. Kategorien: Schlafen 2000 g (30 %), Proviant 3500 g (52 %), Kleidung 1250 g (19 %), Lager 0 g (0 %). Summe der gerundeten Anteile 101 %, das ist so richtig.

**Testvektor 2** (leere Liste): alle Summen 0, keine Division durch null, Anteile 0.

**Testvektor 3** (Einheiten): `zuGramm(1, "lb") = 454`, `zuGramm(10, "oz") = 283`, `zuGramm(1.25, "kg") = 1250`. Anzeige: 1000 g in oz ergibt `35,3 oz`, 2000 g in lb ergibt `4,41 lb`, 6750 g in kg ergibt `6,75 kg`.

**Testvektor 4** (CSV): Zeile `"Zelt, 2 Personen",Schlafen,"leicht",1,1.2,kg,,,,` ergibt Eintrag Name `Zelt, 2 Personen`, 1200 g, Art `basis`, Notiz `leicht`. Zeile `Jacke,Kleidung,,1,12.3,oz,,,Worn,` ergibt 349 g, Art `getragen`.

## Demoseite

`index.html` ist die App selbst, installierbar als PWA (`manifest.webmanifest`, `sw.js`, `icon.svg`: dunkles Quadrat, Rucksack als Linienzeichnung in `#9b8afb`). Handy zuerst, ab 1280 px zweispaltig (Liste links, Auswertung rechts).

- **Listen**: alle Listen mit Name, Basisgewicht und Gesamtgewicht in `--mono`. Knöpfe: neue Liste, duplizieren, löschen (mit Rückfrage). Beim ersten Start eine Beispielliste mit Markierung `beispiel` und Knopf „Beispiel entfernen“.
- **Liste**: Einträge gruppiert nach Kategorie, je Kategorie Zwischensumme. Eintrag antippen öffnet ein Formular (Name, Gewicht mit Einheit, Anzahl, Art als drei Knöpfe, Notiz). Oben feste Leiste mit Basisgewicht und Gesamt. Umschalter „Packmodus“ zeigt nur Haken und Namen, plus „Haken zurücksetzen“.
- **Auswertung**: Kacheln gesamt, getragen, Verbrauch, Rucksack, Basis. Balken je Kategorie mit Gramm und Prozent, Farbe aus den Haus-Tokens.
- **Daten**: Einheit wählen, hell oder dunkel, Export (alle oder aktuelle Liste), Import JSON, Import LighterPack-CSV, Hinweis „Alles bleibt auf deinem Gerät“.

Designsystem des Hauses (Tokens und Schriften lokal eingebunden), Name `rucksack.` mit Punkt in `--ac`, Zahlen und Labels klein in `--mono`.

## Testplan

- **Funktionstests** (Node ohne Abhängigkeiten, `node --test`): Testvektoren 1 bis 4, dazu Validierung (negatives Gewicht, Anzahl 1000, unbekannte Art werden abgewiesen), Export und Re-Import ergeben denselben Zustand (Rundreise), Import mit falschem `format` wird abgelehnt, Duplizieren erzeugt neue IDs und lässt das Original unverändert.
- **Browsertest** bei 390 px und 1280 px, hell und dunkel: Liste anlegen, Einträge erfassen, Summen stimmen mit Testvektor 1, Packmodus, Export, Import, Beispiel entfernen. Kein horizontales Scrollen bei 390 px.
- **Offline-Test**: nach erstem Laden Netz aus, Neuladen, App funktioniert vollständig, Daten bleiben nach Neuladen erhalten.
- **Keine externen Requests**: Netzwerkprotokoll beim Laden und Bedienen zeigt nur eigene Dateien.

## Risiken

- LighterPack-CSV-Format ist nicht offiziell dokumentiert und kann abweichen. Abfederung: Zuordnung über Kopfzeile, verständliche Fehlermeldung, Test mit Beispieldatei.
- `localStorage` kann vom Browser geleert werden (vor allem iOS bei langer Nichtnutzung). Abfederung: sichtbarer Hinweis auf Export, Datum des letzten Exports anzeigen.
- Herstellerangaben zu Gewichten sind oft geschönt. Die App rechnet nur mit dem, was eingegeben wird, und sagt das.
- Feature-Druck (Preise, Vorlagen, Teilen) würde den Job verwässern, bleibt bewusst draußen.
