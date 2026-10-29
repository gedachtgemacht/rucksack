/* rucksack. Rechenlogik und Datenformat als reine Funktionen, ohne DOM.
   Läuft im Browser (window.Rechnen) und in Node (require). Lizenz AGPL-3.0. */
(function (root, fabrik) {
  const api = fabrik();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Rechnen = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FORMAT = 'rucksack';
  const VERSION = 1;
  const ARTEN = ['basis', 'getragen', 'verbrauch'];
  const EINHEITEN = ['g', 'kg', 'oz', 'lb'];
  /* Gramm pro Einheit. oz und lb sind die internationalen Avoirdupois-Werte. */
  const FAKTOR = { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237 };
  const STELLEN = { g: 0, kg: 2, oz: 1, lb: 2 };

  /* ---------- Rechnen ---------- */

  /** Gewicht einer Zeile in Gramm: Gewicht mal Anzahl. */
  function zeilengewicht(e) {
    return e.gewicht_g * e.anzahl;
  }

  /** Kaufmännisch runden (ab ,5 weg von null). toFixed fängt Fließkommareste wie 0,49999999 ab. */
  function runden(x) {
    const sauber = Number(x.toFixed(9));
    return Math.sign(sauber) * Math.floor(Math.abs(sauber) + 0.5);
  }

  /** Wert in einer Einheit nach ganzen Gramm. Unbekannte Einheit oder kein Zahlwert ergibt NaN. */
  function zuGramm(wert, einheit) {
    const f = FAKTOR[einheit];
    const w = typeof wert === 'string' ? zahlAusText(wert) : wert;
    if (!f || typeof w !== 'number' || !isFinite(w)) return NaN;
    return runden(w * f) + 0;
  }

  /** Grammwert als Zahl in der Zieleinheit, ungerundet. */
  function ausGramm(g, einheit) {
    return g / FAKTOR[einheit];
  }

  /** Text mit Punkt oder Komma als Dezimaltrenner nach Zahl. Leerer Text ergibt NaN. */
  function zahlAusText(t) {
    const s = String(t).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '' || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }

  /** Anzeige mit deutschem Dezimalkomma: g ganzzahlig, kg zwei, oz eine, lb zwei Nachkommastellen. */
  function anzeigen(g, einheit) {
    const e = FAKTOR[einheit] ? einheit : 'g';
    return zahlText(g, e) + ' ' + e;
  }

  /** Nur die Zahl, ohne Einheit. */
  function zahlText(g, einheit) {
    const e = FAKTOR[einheit] ? einheit : 'g';
    let t = ausGramm(g, e).toFixed(STELLEN[e]);
    if (/^-0(\.0+)?$/.test(t)) t = t.slice(1);
    return t.replace('.', ',');
  }

  /** Alle Summen einer Liste. Kategorien in Listenreihenfolge, Anteile auf ganze Prozent gerundet. */
  function summen(liste) {
    const eintraege = (liste && liste.eintraege) || [];
    const kategorien = (liste && liste.kategorien) || [];
    let gesamt = 0, getragen = 0, verbrauch = 0;
    const jeKat = new Map();
    for (const e of eintraege) {
      const z = zeilengewicht(e);
      gesamt += z;
      if (e.art === 'getragen') getragen += z;
      else if (e.art === 'verbrauch') verbrauch += z;
      jeKat.set(e.kategorie, (jeKat.get(e.kategorie) || 0) + z);
    }
    const kat = kategorien.map(k => {
      const summe = jeKat.get(k.id) || 0;
      return { id: k.id, name: k.name, summe, anteil: gesamt > 0 ? runden(summe / gesamt * 100) : 0 };
    });
    return {
      gesamt,
      getragen,
      verbrauch,
      rucksack: gesamt - getragen,
      basis: gesamt - getragen - verbrauch,
      kategorien: kat
    };
  }

  /* ---------- IDs und Zeit ---------- */

  function neueId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function jetztIso(d) {
    return (d || new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  /* ---------- Validierung ---------- */

  /** Prüft einen Eintrag. Gibt { ok, eintrag, fehler } zurück, eintrag mit Standardwerten ergänzt. */
  function pruefeEintrag(e) {
    if (!e || typeof e !== 'object') return { ok: false, fehler: 'kein Eintrag' };
    const name = typeof e.name === 'string' ? e.name.trim() : '';
    if (!name) return { ok: false, fehler: 'Name fehlt' };
    if (!Number.isInteger(e.gewicht_g) || e.gewicht_g < 0) return { ok: false, fehler: name + ': Gewicht muss eine ganze Zahl ab 0 sein' };
    if (!Number.isInteger(e.anzahl) || e.anzahl < 0 || e.anzahl > 999) return { ok: false, fehler: name + ': Anzahl muss zwischen 0 und 999 liegen' };
    if (!ARTEN.includes(e.art)) return { ok: false, fehler: name + ': unbekannte Art' };
    return {
      ok: true,
      eintrag: {
        id: typeof e.id === 'string' && e.id ? e.id : neueId(),
        kategorie: typeof e.kategorie === 'string' ? e.kategorie : '',
        name,
        gewicht_g: e.gewicht_g,
        anzahl: e.anzahl,
        art: e.art,
        gepackt: e.gepackt === true,
        notiz: typeof e.notiz === 'string' ? e.notiz : ''
      }
    };
  }

  /** Prüft eine Liste, verwirft ungültige Einträge und meldet sie. Gibt { liste, meldungen } oder { fehler }. */
  function pruefeListe(l, jetzt) {
    if (!l || typeof l !== 'object') return { fehler: 'Liste ohne Inhalt' };
    const name = typeof l.name === 'string' && l.name.trim() ? l.name.trim() : 'Ohne Namen';
    const meldungen = [];
    const kategorien = [];
    const katIds = new Set();
    for (const k of Array.isArray(l.kategorien) ? l.kategorien : []) {
      if (!k || typeof k.id !== 'string' || !k.id || katIds.has(k.id)) continue;
      katIds.add(k.id);
      kategorien.push({ id: k.id, name: typeof k.name === 'string' && k.name.trim() ? k.name.trim() : 'Ohne Namen' });
    }
    const eintraege = [];
    const eIds = new Set();
    let ohne = null;
    for (const roh of Array.isArray(l.eintraege) ? l.eintraege : []) {
      const p = pruefeEintrag(roh);
      if (!p.ok) { meldungen.push(name + ': ' + p.fehler + ', verworfen'); continue; }
      const e = p.eintrag;
      if (eIds.has(e.id)) e.id = neueId();
      eIds.add(e.id);
      if (!katIds.has(e.kategorie)) {
        if (!ohne) { ohne = { id: neueId(), name: 'Ohne Kategorie' }; kategorien.push(ohne); katIds.add(ohne.id); }
        e.kategorie = ohne.id;
      }
      eintraege.push(e);
    }
    const t = jetztIso(jetzt);
    return {
      liste: {
        id: typeof l.id === 'string' && l.id ? l.id : neueId(),
        name,
        notiz: typeof l.notiz === 'string' ? l.notiz : '',
        beispiel: l.beispiel === true,
        erstellt: typeof l.erstellt === 'string' ? l.erstellt : t,
        geaendert: typeof l.geaendert === 'string' ? l.geaendert : t,
        kategorien,
        eintraege
      },
      meldungen
    };
  }

  /* ---------- Zustand, Export, Import ---------- */

  function leererZustand() {
    return { format: FORMAT, version: VERSION, listen: [] };
  }

  /** Exportobjekt: alle Listen oder nur die mit listeId. */
  function exportieren(zustand, listeId) {
    const listen = listeId ? zustand.listen.filter(l => l.id === listeId) : zustand.listen;
    return { format: FORMAT, version: VERSION, listen: JSON.parse(JSON.stringify(listen)) };
  }

  /** Dateiname für den Export: rucksack-JJJJ-MM-TT.json, nach lokalem Datum. */
  function dateiname(d) {
    const z = n => String(n).padStart(2, '0');
    return 'rucksack-' + d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '.json';
  }

  /**
   * Liest eine Exportdatei (Text oder Objekt). Wirft bei falschem Format oder falscher Version.
   * Gibt { listen, meldungen } zurück. Listen-IDs, die in vorhandeneIds stehen, werden neu vergeben.
   */
  function importierenJson(eingabe, vorhandeneIds, jetzt) {
    let d = eingabe;
    if (typeof eingabe === 'string') {
      try { d = JSON.parse(eingabe); } catch (_) { throw new Error('Die Datei ist kein gültiges JSON.'); }
    }
    if (!d || typeof d !== 'object' || d.format !== FORMAT) throw new Error('Das ist keine rucksack.-Datei (format fehlt oder stimmt nicht).');
    if (d.version !== VERSION) throw new Error('Unbekannte Version ' + d.version + ', erwartet wird Version ' + VERSION + '.');
    if (!Array.isArray(d.listen)) throw new Error('Die Datei enthält keine Listen.');
    const belegt = new Set(vorhandeneIds || []);
    const listen = [], meldungen = [];
    for (const roh of d.listen) {
      const p = pruefeListe(roh, jetzt);
      if (p.fehler) { meldungen.push(p.fehler + ', verworfen'); continue; }
      if (belegt.has(p.liste.id)) p.liste.id = neueId();
      belegt.add(p.liste.id);
      listen.push(p.liste);
      meldungen.push(...p.meldungen);
    }
    return { listen, meldungen };
  }

  /** Kopie einer Liste mit neuen IDs für Liste, Kategorien und Einträge. Das Original bleibt unverändert. */
  function duplizieren(liste, jetzt) {
    const t = jetztIso(jetzt);
    const katMap = new Map();
    const kategorien = liste.kategorien.map(k => {
      const id = neueId();
      katMap.set(k.id, id);
      return { id, name: k.name };
    });
    const eintraege = liste.eintraege.map(e => Object.assign({}, e, {
      id: neueId(),
      kategorie: katMap.get(e.kategorie) || e.kategorie,
      gepackt: false
    }));
    return {
      id: neueId(),
      name: liste.name + ' (Kopie)',
      notiz: liste.notiz,
      beispiel: liste.beispiel,
      erstellt: t,
      geaendert: t,
      kategorien,
      eintraege
    };
  }

  /** Verschiebt ein Element in einem Array um richtung (-1 hoch, +1 runter). Gibt ein neues Array zurück. */
  function verschieben(arr, index, richtung) {
    const ziel = index + richtung;
    const neu = arr.slice();
    if (index < 0 || index >= arr.length || ziel < 0 || ziel >= arr.length) return neu;
    const [x] = neu.splice(index, 1);
    neu.splice(ziel, 0, x);
    return neu;
  }

  /* ---------- CSV ---------- */

  /** CSV nach Zeilen und Feldern (RFC 4180: Anführungszeichen, verdoppelte Anführungszeichen, Zeilenumbrüche im Feld). */
  function csvZerlegen(text) {
    const s = String(text).replace(/^﻿/, '');
    const zeilen = [];
    let feld = '', zeile = [], inQ = false, i = 0;
    while (i < s.length) {
      const c = s[i];
      if (inQ) {
        if (c === '"') {
          if (s[i + 1] === '"') { feld += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        feld += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { zeile.push(feld); feld = ''; i++; continue; }
      if (c === '\r' || c === '\n') {
        zeile.push(feld); zeilen.push(zeile); zeile = []; feld = '';
        if (c === '\r' && s[i + 1] === '\n') i++;
        i++; continue;
      }
      feld += c; i++;
    }
    if (feld !== '' || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
    return zeilen.filter(z => !(z.length === 1 && z[0].trim() === ''));
  }

  const CSV_SPALTEN = { name: 'item name', kategorie: 'category', notiz: 'desc', anzahl: 'qty', gewicht: 'weight', einheit: 'unit', getragen: 'worn', verbrauch: 'consumable' };

  function gesetzt(v) {
    const t = String(v == null ? '' : v).trim().toLowerCase();
    return t !== '' && t !== '0' && t !== 'false';
  }

  /** Eine Datenzeile mit gegebener Spaltenzuordnung nach Eintrag (ohne Kategorie-ID). Gibt { eintrag, kategorie } oder { fehler }. */
  function csvZeileZuEintrag(felder, spalte) {
    const f = k => (spalte[k] >= 0 && spalte[k] < felder.length ? felder[spalte[k]] : '').trim();
    const name = f('name');
    if (!name) return { fehler: 'Zeile ohne Namen' };
    const einheitRoh = f('einheit').toLowerCase() || 'g';
    const einheit = { gram: 'g', grams: 'g', kilogram: 'kg', ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb' }[einheitRoh] || einheitRoh;
    if (!FAKTOR[einheit]) return { fehler: name + ': unbekannte Einheit ' + einheitRoh };
    const gewichtRoh = f('gewicht');
    const g = gewichtRoh === '' ? 0 : zuGramm(gewichtRoh, einheit);
    if (!isFinite(g) || g < 0) return { fehler: name + ': Gewicht nicht lesbar' };
    const qRoh = f('anzahl');
    const anzahl = qRoh === '' ? 1 : zahlAusText(qRoh);
    if (!Number.isInteger(anzahl) || anzahl < 0 || anzahl > 999) return { fehler: name + ': Anzahl nicht lesbar' };
    let art = 'basis';
    if (gesetzt(f('getragen'))) art = 'getragen';
    if (gesetzt(f('verbrauch'))) art = 'verbrauch';
    return {
      kategorie: f('kategorie') || 'Ohne Kategorie',
      eintrag: { name, gewicht_g: g, anzahl, art, gepackt: false, notiz: f('notiz') }
    };
  }

  /** LighterPack-CSV als neue Liste. Spalten über die Kopfzeile. Wirft, wenn Pflichtspalten fehlen. */
  function importierenCsv(text, listenName, jetzt) {
    const zeilen = csvZerlegen(text);
    if (!zeilen.length) throw new Error('Die CSV-Datei ist leer.');
    const kopf = zeilen[0].map(h => h.trim().toLowerCase());
    const spalte = {};
    for (const k in CSV_SPALTEN) spalte[k] = kopf.indexOf(CSV_SPALTEN[k]);
    const fehlend = ['name', 'gewicht'].filter(k => spalte[k] < 0).map(k => CSV_SPALTEN[k]);
    if (fehlend.length) throw new Error('Das sieht nicht nach einer LighterPack-CSV aus, es fehlt die Spalte ' + fehlend.join(', ') + '.');
    const t = jetztIso(jetzt);
    const liste = { id: neueId(), name: listenName || 'LighterPack-Import', notiz: '', beispiel: false, erstellt: t, geaendert: t, kategorien: [], eintraege: [] };
    const katNachName = new Map();
    const meldungen = [];
    zeilen.slice(1).forEach((felder, i) => {
      const r = csvZeileZuEintrag(felder, spalte);
      if (r.fehler) { meldungen.push('Zeile ' + (i + 2) + ': ' + r.fehler + ', verworfen'); return; }
      let kid = katNachName.get(r.kategorie);
      if (!kid) {
        kid = neueId();
        katNachName.set(r.kategorie, kid);
        liste.kategorien.push({ id: kid, name: r.kategorie });
      }
      liste.eintraege.push(Object.assign({ id: neueId(), kategorie: kid }, r.eintrag));
    });
    return { liste, meldungen };
  }

  /* ---------- Beispiel ---------- */

  /** Erfundene Beispielliste (Testvektor 1), markiert als beispiel. */
  function beispielListe(jetzt) {
    const t = jetztIso(jetzt);
    const k = n => ({ id: neueId(), name: n });
    const schlafen = k('Schlafen'), proviant = k('Proviant'), kleidung = k('Kleidung'), lager = k('Lager');
    const e = (kat, name, g, anzahl, art, notiz) => ({ id: neueId(), kategorie: kat.id, name, gewicht_g: g, anzahl, art, gepackt: false, notiz: notiz || '' });
    return {
      id: neueId(),
      name: 'Beispiel: Wochenende Mittelgebirge',
      notiz: 'Erfundene Beispielliste',
      beispiel: true,
      erstellt: t,
      geaendert: t,
      kategorien: [schlafen, proviant, kleidung, lager],
      eintraege: [
        e(schlafen, 'Zelt', 1200, 1, 'basis', '2 Personen'),
        e(schlafen, 'Schlafsack', 800, 1, 'basis'),
        e(proviant, 'Wasser', 1000, 2, 'verbrauch', 'je Liter'),
        e(proviant, 'Essen pro Tag', 500, 3, 'verbrauch'),
        e(kleidung, 'Schuhe', 900, 1, 'getragen'),
        e(kleidung, 'Jacke', 350, 1, 'getragen'),
        e(lager, 'Stuhl', 450, 0, 'basis', 'bleibt diesmal daheim')
      ]
    };
  }

  return {
    FORMAT, VERSION, ARTEN, EINHEITEN, FAKTOR,
    zeilengewicht, runden, zuGramm, ausGramm, zahlAusText, anzeigen, zahlText, summen,
    neueId, jetztIso, pruefeEintrag, pruefeListe,
    leererZustand, exportieren, dateiname, importierenJson, duplizieren, verschieben,
    csvZerlegen, importierenCsv, beispielListe
  };
});
