# rucksack.

**Wie schwer ist dein Rucksack wirklich?** rucksack. rechnet dir Basisgewicht, getragenes Gewicht und Verbrauch deiner Packliste aus, offline und ohne Konto.

Wer wandert, mit dem Rad auf Tour geht oder leicht reisen will, plant die Ausrüstung als Liste mit Gewichten. Dafür gibt es Webdienste mit Konto oder Apps, die Geld kosten. Die Liste liegt dann auf fremden Servern, und im Gelände ohne Netz kommst du nicht dran. rucksack. macht den Kern davon als installierbare Web-App: Gegenstände mit Gewicht, Kategorien, die Trennung in Basis, getragen und Verbrauch, Listen zum Wiederverwenden und Sichern als Datei.

Reine Rechnung, keine KI, kein Server. Alles bleibt auf deinem Handy.

<p align="center">
  <img src="bilder/1-uebersicht.png" width="240" alt="">
</p>
<p align="center">
  <img src="bilder/2-breit.png" width="640" alt="">
</p>

## Warum

Bezahlte Packlisten-Apps stellen Abhaken in den Vordergrund, Gewichte sind Nebensache. Die bekannten Gewichtslisten der Leichtgewicht-Szene laufen als Webdienst mit Konto und sind offline nicht nutzbar. rucksack. ist das Gegenstück ohne Konto und ohne Server, mit Export und Import als Datei.

## Funktionen

- **Mehrere Listen**: anlegen, umbenennen, löschen (mit Rückfrage) und duplizieren, zum Beispiel für die nächste Tour
- **Kategorien** pro Liste, frei benennbar, mit Hoch- und Runter-Knopf sortierbar
- **Einträge** mit Name, Gewicht, Anzahl, Art (`basis`, `getragen`, `verbrauch`) und Notiz. Gewicht in g, kg, oz oder lb, gespeichert wird immer in ganzen Gramm
- **Summen live**: gesamt, getragen, Verbrauch, Rucksackgewicht und Basisgewicht, je Kategorie mit Anteil in Prozent und Balken
- **Anzeigeeinheit** wählbar: g, kg, oz, lb
- **Packmodus**: nur Haken und Namen, dazu ein Knopf, der alle Haken zurücksetzt
- **Export** aller Listen oder der aktuellen Liste als JSON-Datei, Import von JSON
- **Import von LighterPack-CSV** als neue Liste, für den Umzug
- **Beispielliste**, als `beispiel` markiert und mit einem Klick entfernbar
- Hell und dunkel, funktioniert offline, installierbar als App

Bewusst nicht dabei: Konto, Sync, Teilen per Link, Ausrüstungsdatenbank mit Herstellergewichten, Preise, Vorschläge nach Ziel oder Wetter, Bilder zu Einträgen, CSV-Export im LighterPack-Format. Die Art gilt für den ganzen Eintrag. Wer ein Stück trägt und den Rest im Rucksack hat, legt zwei Einträge an.

## Datenschutz

Nichts verlässt dein Gerät. rucksack. hat keinen Server, kein Konto, keine Analyse, keine Werbung und lädt nichts aus dem Netz nach. Schriften und Icons liegen in der App selbst. Deine Listen liegen im `localStorage` deines Browsers. Exporte entstehen nur, wenn du sie selbst auslöst.

Weil die Daten nur im Browser liegen: Wer die Websitedaten löscht, löscht auch die Listen. Manche Browser räumen Daten bei langer Nichtnutzung von selbst auf. Mach deshalb ab und zu eine Sicherung, die App zeigt dir das Datum des letzten Exports.

## Installation

rucksack. ist eine statische Web-App. Es gibt keinen Build-Schritt und keine Abhängigkeiten.

1. Den Ordner `rucksack/` auf einen beliebigen statischen Host legen (eigener Webspace, GitHub Pages, Netlify, ein Raspberry Pi). Für die Installation als App ist HTTPS nötig.
2. Die Adresse im Handybrowser öffnen.
3. Im Browsermenü **Zum Startbildschirm hinzufügen** wählen. Danach startet rucksack. wie eine App und funktioniert auch ohne Netz.

Lokal testen:

```
cd rucksack
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen.

## Wie gerechnet wird

Die Rechenfunktionen stehen als reine Funktionen in `rechnen.js`, ohne DOM.

**Zeile.** Gewicht × Anzahl. Anzahl 0 heißt: steht auf der Liste, kommt diesmal nicht mit und zählt nicht.

**Summen.**
- gesamt = Summe aller Zeilen
- getragen = Summe der Zeilen mit Art `getragen`
- verbrauch = Summe der Zeilen mit Art `verbrauch`
- rucksackgewicht = gesamt minus getragen (was auf dem Rücken liegt, inklusive Verbrauch)
- basisgewicht = gesamt minus getragen minus verbrauch

**Kategorien.** Summe je Kategorie, Anteil = Summe ÷ gesamt × 100, auf ganze Prozent gerundet. Bei gesamt = 0 ist der Anteil 0. Die gerundeten Anteile müssen nicht genau 100 ergeben, das wird nicht kaschiert.

**Einheiten.** 1 oz = 28,349523125 g, 1 lb = 453,59237 g. Eingaben werden kaufmännisch auf ganze Gramm gerundet. Anzeige: g ganzzahlig, kg mit zwei, oz mit einer, lb mit zwei Nachkommastellen, mit Dezimalkomma.

**Beispiel.** Zelt 1200 g, Schlafsack 800 g (beide `basis`), Wasser 2 × 1000 g und Essen 3 × 500 g (beide `verbrauch`), Schuhe 900 g und Jacke 350 g (beide `getragen`), Stuhl 450 g mit Anzahl 0:

- gesamt 6750 g, getragen 1250 g, Verbrauch 3500 g
- Rucksackgewicht 5500 g, Basisgewicht 2000 g
- Schlafen 30 %, Proviant 52 %, Kleidung 19 %, Lager 0 % (zusammen 101 %, das ist so richtig)

**LighterPack-CSV.** Die Spalten werden über die Kopfzeile zugeordnet, nicht über die Position. Einheiten `g`, `kg`, `oz`, `lb`. Ist `worn` oder `consumable` gesetzt, wird die Art `getragen` bzw. `verbrauch`, bei beidem gewinnt `verbrauch`. `url` und `price` werden ignoriert, `desc` wird zur Notiz. Das Format ist nicht offiziell dokumentiert und kann abweichen, bei Fehlern meldet die App das.

**Grenzen.** rucksack. rechnet nur mit den Gewichten, die du eingibst. Herstellerangaben sind oft geschönt, wiege im Zweifel selbst nach.

Die Tests laufen ohne Abhängigkeiten mit `node --test` oder `node test-calc.js` und prüfen die Handrechnungen und Testvektoren.

## Lizenz

GNU Affero General Public License v3.0 (AGPL-3.0), siehe `LICENSE`.

---

**gedacht.gemacht.** Kleine, ehrliche Software. Alles bleibt auf deinem Gerät.
