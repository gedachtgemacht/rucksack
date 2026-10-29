/* Tests gegen die Handrechnungen und Testvektoren aus dem Scope. Start: node test-calc.js oder node --test */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./rechnen.js');

function liste(zeilen) {
  const kategorien = [];
  const nachName = new Map();
  const eintraege = zeilen.map(([name, kat, g, anzahl, art], i) => {
    if (!nachName.has(kat)) { nachName.set(kat, 'k' + nachName.size); kategorien.push({ id: nachName.get(kat), name: kat }); }
    return { id: 'e' + i, kategorie: nachName.get(kat), name, gewicht_g: g, anzahl, art, gepackt: false, notiz: '' };
  });
  return { id: 'l1', name: 'Test', notiz: '', beispiel: false, erstellt: '2026-10-29T10:00:00Z', geaendert: '2026-10-29T10:00:00Z', kategorien, eintraege };
}

const TV1 = liste([
  ['Zelt', 'Schlafen', 1200, 1, 'basis'],
  ['Schlafsack', 'Schlafen', 800, 1, 'basis'],
  ['Wasser', 'Proviant', 1000, 2, 'verbrauch'],
  ['Essen pro Tag', 'Proviant', 500, 3, 'verbrauch'],
  ['Schuhe', 'Kleidung', 900, 1, 'getragen'],
  ['Jacke', 'Kleidung', 350, 1, 'getragen'],
  ['Stuhl', 'Lager', 450, 0, 'basis']
]);

test('Testvektor 1: Summen', () => {
  const s = R.summen(TV1);
  assert.equal(s.gesamt, 6750);
  assert.equal(s.getragen, 1250);
  assert.equal(s.verbrauch, 3500);
  assert.equal(s.rucksack, 5500);
  assert.equal(s.basis, 2000);
});

test('Testvektor 1: Kategorien mit Anteil, Summe der Anteile 101', () => {
  const s = R.summen(TV1);
  assert.deepEqual(s.kategorien.map(k => [k.name, k.summe, k.anteil]), [
    ['Schlafen', 2000, 30],
    ['Proviant', 3500, 52],
    ['Kleidung', 1250, 19],
    ['Lager', 0, 0]
  ]);
  assert.equal(s.kategorien.reduce((a, k) => a + k.anteil, 0), 101);
});

test('Testvektor 1: Beispielliste rechnet genauso', () => {
  const s = R.summen(R.beispielListe());
  assert.equal(s.gesamt, 6750);
  assert.equal(s.basis, 2000);
  assert.equal(s.rucksack, 5500);
});

test('Testvektor 2: leere Liste', () => {
  const s = R.summen({ kategorien: [{ id: 'k', name: 'Leer' }], eintraege: [] });
  assert.deepEqual([s.gesamt, s.getragen, s.verbrauch, s.rucksack, s.basis], [0, 0, 0, 0, 0]);
  assert.equal(s.kategorien[0].anteil, 0);
  const t = R.summen({ kategorien: [{ id: 'k', name: 'Null' }], eintraege: [{ kategorie: 'k', gewicht_g: 500, anzahl: 0, art: 'basis' }] });
  assert.equal(t.kategorien[0].anteil, 0);
  assert.ok(!Number.isNaN(t.kategorien[0].anteil));
});

test('Testvektor 3: zuGramm', () => {
  assert.equal(R.zuGramm(1, 'lb'), 454);
  assert.equal(R.zuGramm(10, 'oz'), 283);
  assert.equal(R.zuGramm(1.25, 'kg'), 1250);
  assert.equal(R.zuGramm('1,25', 'kg'), 1250);
  assert.equal(R.zuGramm(0.5, 'g'), 1, 'kaufmännisch: ,5 rundet auf');
  assert.equal(R.zuGramm(1.0005, 'kg'), 1001, '1000,5 g rundet auf');
  assert.ok(Number.isNaN(R.zuGramm(1, 'stein')));
  assert.ok(Number.isNaN(R.zuGramm('abc', 'g')));
});

test('Testvektor 3: Anzeige', () => {
  assert.equal(R.anzeigen(1000, 'oz'), '35,3 oz');
  assert.equal(R.anzeigen(2000, 'lb'), '4,41 lb');
  assert.equal(R.anzeigen(6750, 'kg'), '6,75 kg');
  assert.equal(R.anzeigen(6750, 'g'), '6750 g');
  assert.equal(R.anzeigen(0, 'kg'), '0,00 kg');
});

test('Testvektor 4: LighterPack-CSV', () => {
  const csv = 'Item Name,Category,desc,qty,weight,unit,url,price,worn,consumable\n' +
    '"Zelt, 2 Personen",Schlafen,"leicht",1,1.2,kg,,,,\n' +
    'Jacke,Kleidung,,1,12.3,oz,,,Worn,\n';
  const { liste: l, meldungen } = R.importierenCsv(csv, 'Import');
  assert.deepEqual(meldungen, []);
  assert.equal(l.eintraege.length, 2);
  const [zelt, jacke] = l.eintraege;
  assert.equal(zelt.name, 'Zelt, 2 Personen');
  assert.equal(zelt.gewicht_g, 1200);
  assert.equal(zelt.art, 'basis');
  assert.equal(zelt.notiz, 'leicht');
  assert.equal(jacke.gewicht_g, 349);
  assert.equal(jacke.art, 'getragen');
  assert.deepEqual(l.kategorien.map(k => k.name), ['Schlafen', 'Kleidung']);
  assert.equal(zelt.kategorie, l.kategorien[0].id);
});

test('CSV: Zuordnung über den Kopf, beides gesetzt ergibt verbrauch, 0 und false gelten als leer', () => {
  const csv = 'qty,consumable,worn,Category,Item Name,weight,unit,price,url,desc\r\n' +
    '2,1,1,Proviant,Riegel,50,g,3.50,link-wird-ignoriert,"sagt ""lecker"""\r\n' +
    '1,0,false,Küche,Topf,0.25,lb,,,\r\n';
  const { liste: l } = R.importierenCsv(csv);
  assert.equal(l.eintraege[0].art, 'verbrauch');
  assert.equal(l.eintraege[0].anzahl, 2);
  assert.equal(l.eintraege[0].notiz, 'sagt "lecker"');
  assert.equal(l.eintraege[1].art, 'basis');
  assert.equal(l.eintraege[1].gewicht_g, 113);
});

test('CSV: ungültige Zeilen werden mit Meldung verworfen, fehlender Kopf wirft', () => {
  const csv = 'Item Name,Category,desc,qty,weight,unit,url,price,worn,consumable\n' +
    'Stein,Kram,,1,abc,g,,,,\n' +
    'Feder,Kram,,1,1,stein,,,,\n' +
    'Löffel,Küche,,1,20,g,,,,\n';
  const { liste: l, meldungen } = R.importierenCsv(csv);
  assert.equal(l.eintraege.length, 1);
  assert.equal(meldungen.length, 2);
  assert.throws(() => R.importierenCsv('Name,Gewicht\nZelt,1200'), /LighterPack/);
});

test('Validierung: negatives Gewicht, Anzahl 1000, unbekannte Art werden abgewiesen', () => {
  const gut = { name: 'Zelt', gewicht_g: 1200, anzahl: 1, art: 'basis' };
  assert.ok(R.pruefeEintrag(gut).ok);
  assert.equal(R.pruefeEintrag(Object.assign({}, gut, { gewicht_g: -1 })).ok, false);
  assert.equal(R.pruefeEintrag(Object.assign({}, gut, { gewicht_g: 1.5 })).ok, false);
  assert.equal(R.pruefeEintrag(Object.assign({}, gut, { anzahl: 1000 })).ok, false);
  assert.ok(R.pruefeEintrag(Object.assign({}, gut, { anzahl: 999 })).ok);
  assert.ok(R.pruefeEintrag(Object.assign({}, gut, { anzahl: 0 })).ok);
  assert.equal(R.pruefeEintrag(Object.assign({}, gut, { art: 'rucksack' })).ok, false);
  assert.equal(R.pruefeEintrag(Object.assign({}, gut, { name: '  ' })).ok, false);
});

test('Import verwirft ungültige Einträge mit Meldung', () => {
  const daten = R.exportieren({ listen: [TV1] });
  daten.listen[0].eintraege.push({ id: 'x', kategorie: 'k0', name: 'Kaputt', gewicht_g: -5, anzahl: 1, art: 'basis' });
  const r = R.importierenJson(JSON.stringify(daten), []);
  assert.equal(r.listen[0].eintraege.length, 7);
  assert.equal(r.meldungen.length, 1);
  assert.match(r.meldungen[0], /Kaputt/);
});

test('Rundreise: Export und Re-Import ergeben denselben Zustand', () => {
  const zustand = { format: 'rucksack', version: 1, listen: [TV1, R.beispielListe(new Date('2026-10-29T10:00:00Z'))] };
  const text = JSON.stringify(R.exportieren(zustand));
  const r = R.importierenJson(text, []);
  assert.deepEqual(r.meldungen, []);
  assert.deepEqual(r.listen, zustand.listen);
  const eine = R.importierenJson(JSON.stringify(R.exportieren(zustand, 'l1')), []);
  assert.equal(eine.listen.length, 1);
  assert.deepEqual(eine.listen[0], TV1);
});

test('Import bei gleicher ID vergibt neue ID und überschreibt nichts', () => {
  const r = R.importierenJson(R.exportieren({ listen: [TV1] }), ['l1']);
  assert.notEqual(r.listen[0].id, 'l1');
  assert.equal(r.listen[0].name, TV1.name);
});

test('Import mit falschem format oder falscher version wird abgelehnt', () => {
  assert.throws(() => R.importierenJson(JSON.stringify({ format: 'lighterpack', version: 1, listen: [] }), []), /keine rucksack/);
  assert.throws(() => R.importierenJson(JSON.stringify({ format: 'rucksack', version: 2, listen: [] }), []), /Version/);
  assert.throws(() => R.importierenJson('{kaputt', []), /JSON/);
});

test('Duplizieren erzeugt neue IDs und lässt das Original unverändert', () => {
  const vorher = JSON.stringify(TV1);
  TV1.eintraege[0].gepackt = true;
  const kopie = R.duplizieren(TV1);
  TV1.eintraege[0].gepackt = false;
  assert.equal(JSON.stringify(TV1), vorher);
  assert.notEqual(kopie.id, TV1.id);
  const alteIds = new Set([...TV1.kategorien.map(k => k.id), ...TV1.eintraege.map(e => e.id)]);
  for (const k of kopie.kategorien) assert.ok(!alteIds.has(k.id));
  for (const e of kopie.eintraege) {
    assert.ok(!alteIds.has(e.id));
    assert.ok(kopie.kategorien.some(k => k.id === e.kategorie));
    assert.equal(e.gepackt, false);
  }
  assert.deepEqual(R.summen(kopie).gesamt, 6750);
  kopie.eintraege[0].gewicht_g = 1;
  assert.equal(TV1.eintraege[0].gewicht_g, 1200);
});

test('Verschieben und Dateiname', () => {
  assert.deepEqual(R.verschieben(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(R.verschieben(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c']);
  assert.equal(R.dateiname(new Date(2026, 9, 29, 12)), 'rucksack-2026-10-29.json');
});
