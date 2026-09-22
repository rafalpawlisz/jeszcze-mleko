// Tests: node test.js
//
// No framework, no dependencies — the same rule as the rest of the project. Exits
// non-zero on failure, so it can gate a commit or a deploy.
//
// What is covered is what has actually broken: the department dictionary, where
// one added stem can silently steal words from another, and the amount parser,
// where the whole design rests on refusing to guess. Both regressions found
// during development were caught by cases like these, not by using the app.

import { guessDepartment, emojiFor } from './departments.js';
import { splitAmount } from './amount.js';
import { record, suggest } from './history.js';
import { t, setLocalePreference } from './i18n.js';

let passed = 0;
const failures = [];

function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    got      ${a}`);
}

function section(name) {
  console.log(`\n${name}`);
}

// ============================================================================
//  Departments
// ============================================================================

section('departments — Polish');
[
  ['mleko', 'nabial'], ['śmietana 18%', 'nabial'], ['jajka', 'nabial'],
  ['chleb razowy', 'pieczywo'], ['pomidory', 'warzywa'], ['winogrona', 'warzywa'],
  ['ser żółty', 'nabial'], ['mielone', 'mieso'], ['łosoś wędzony', 'ryby'],
  ['papier toaletowy', 'chemia'], ['papier do pieczenia', 'dom'],
  ['proszek do prania', 'chemia'], ['proszek do pieczenia', 'sypkie'],
  ['serwetki', 'dom'], ['wino', 'alkohole'], ['lody', 'mrozonki'],
  ['wihajster', 'inne'],
].forEach(([name, want]) => check(`  ${name}`, guessDepartment(name), want));

section('departments — English');
[
  ['milk', 'nabial'], ['bread', 'pieczywo'], ['tomatoes', 'warzywa'],
  ['chicken breast', 'mieso'], ['salmon fillet', 'ryby'], ['beer', 'alkohole'],
  ['toilet paper', 'chemia'], ['ice cream', 'mrozonki'], ['eggs', 'nabial'],
  ['batteries', 'dom'], ['blahblah', 'inne'],
].forEach(([name, want]) => check(`  ${name}`, guessDepartment(name), want));

section('departments — longest stem wins');
[
  // Each pair exists because the shorter stem would otherwise swallow the word.
  ['masło', 'nabial'], ['masło orzechowe', 'slodycze'],
  ['peanut butter', 'slodycze'], ['cream', 'nabial'], ['face cream', 'chemia'],
  ['paluszki', 'slodycze'], ['paluszki rybne', 'ryby'],
  ['herbata', 'napoje'], ['herbatniki', 'slodycze'],
  ['kawa', 'napoje'], ['kawior', 'ryby'],
  ['ogórki', 'warzywa'], ['ogórki kiszone', 'konserwy'],
  ['gin', 'alkohole'], ['ginger', 'warzywa'],
  ['egg', 'nabial'], ['eggplant', 'warzywa'],
  ['straw', 'dom'], ['strawberries', 'warzywa'],
  ['nut', 'slodycze'], ['nutmeg', 'sypkie'],
  ['maślanka', 'nabial'], ['maślak', 'warzywa'],
  ['boczek', 'mieso'], ['boczniak', 'warzywa'],
  ['kurczak', 'mieso'], ['kurki', 'warzywa'], ['kurkuma', 'sypkie'],
  ['makaron', 'sypkie'], ['pasta', 'sypkie'], ['pasta do zębów', 'chemia'],
  ['krem', 'chemia'], ['kremówka', 'slodycze'],
].forEach(([name, want]) => check(`  ${name}`, guessDepartment(name), want));

section('departments — dominant words beat the longest stem');
[
  // Without the dominant list these land in produce, because the fruit stem is
  // longer than "mrozon" / "sok".
  ['mrożone truskawki', 'mrozonki'], ['mrożony groszek', 'mrozonki'],
  ['frozen peas', 'mrozonki'],
  ['sok jabłkowy', 'napoje'], ['sok z czarnej porzeczki', 'napoje'],
  ['orange juice', 'napoje'],
  // Here it is the noun that has to win over a longer qualifier.
  ['patera na ciasto', 'dom'], ['patera na owoce', 'dom'],
  ['patelnia do pieczenia', 'dom'],
].forEach(([name, want]) => check(`  ${name}`, guessDepartment(name), want));

section('departments — health');
[
  ['suplement', 'zdrowie'], ['elektrolity', 'zdrowie'], ['kolagen', 'zdrowie'],
  ['probiotyk', 'zdrowie'], ['witaminy', 'zdrowie'], ['magnez', 'zdrowie'],
  ['ibuprofen', 'zdrowie'], ['vitamin d', 'zdrowie'],
  ['syrop na kaszel', 'zdrowie'], ['syrop klonowy', 'slodycze'],
  ['podgrzybki', 'warzywa'],
  ['nić dentystyczna', 'chemia'], ['nitka dentystyczna', 'chemia'],
  ['rękawiczki nitrylowe', 'chemia'],
].forEach(([name, want]) => check(`  ${name}`, guessDepartment(name), want));

section('departments — gaps found by probing real shopping words');
[
  ['prezerwatywy', 'chemia'], ['wacik', 'chemia'], ['zmywak', 'chemia'],
  ['papier śniadaniowy', 'dom'],
  // "twaróg" alone missed "twarożek": one letter differs in the middle.
  ['twaróg', 'nabial'], ['twarożek', 'nabial'], ['serek wiejski', 'nabial'],
  // A phrase built on a stem never matched, because a phrase is compared as a
  // substring and "maszynka" is not "maszynk" followed by a space. Matching on
  // "do golenia" covers the razor, the foam and the gel at once.
  ['maszynka do golenia', 'chemia'], ['pianka do golenia', 'chemia'],
  ['żel do golenia', 'chemia'],
  // The other name for a kremówka, which the dictionary knew only as "ciasto".
  ['napoleonka', 'slodycze'], ['napoleonki', 'slodycze'],
].forEach(([name, want]) => check(`  ${name}`, guessDepartment(name), want));

section('departments — a whole word does not swallow a longer one');
[
  // "pate" as a prefix is what filed a platter under mięso: patera, patelnia
  // and patent all start with the same four letters.
  ['pate', 'mieso'], ['patera', 'dom'], ['patery', 'dom'], ['patelnia', 'dom'],
  ['ham', 'mieso'], ['hamak', 'inne'], ['hamulec', 'inne'],
  ['gin', 'alkohole'], ['ginekolog', 'inne'],
  ['ale', 'alkohole'], ['alergia', 'inne'],
  ['rum', 'alkohole'], ['rumianek', 'napoje'],
].forEach(([name, want]) => check(`  ${name}`, guessDepartment(name), want));

section('emoji — the product, not the category');
[
  ['mleko', '🥛'], ['chleb', '🍞'], ['pomidory', '🍅'], ['szynka', '🥓'],
  ['ser żółty', '🧀'], ['masło', '🧈'], ['masło orzechowe', '🥜'],
  ['papier toaletowy', '🧻'], ['witaminy', '💊'], ['baterie', '🔋'],
  // The section header already says Frozen, so the row shows what the thing is.
  ['mrożony groszek', '🫘'],
  // But juice is the noun and the fruit only qualifies it, hence the override.
  ['sok jabłkowy', '🧃'], ['sok', '🧃'],
  // Same collision as the departments had, in the parallel dictionary.
  ['pasta do zębów', '🪥'], ['makaron', '🍝'],
  // A platter is not a slice of ham, and "pate" must still be one.
  ['pate', '🥓'], ['patera', ''],
  // The cake is what it carries, not what it is.
  ['kremówka', '🍰'], ['napoleonka', '🍰'], ['patera na ciasto', ''],
  // A name that is emphatically not the cream it is made of.
  ['krem', '🧴'],
  // Nothing rather than a wrong guess; the row reserves the space anyway.
  ['wihajster', ''], ['', ''],
].forEach(([name, want]) => check(`  ${name || "(puste)"}`, emojiFor(name), want));

// ============================================================================
//  Amount splitting
// ============================================================================

const split = (text) => {
  const { name, amount } = splitAmount(text);
  return [name, amount];
};

section('amount — split when a unit is present');
[
  ['szynka 50 dag', ['szynka', '50 dag']],
  ['ser żółty 30 dag', ['ser żółty', '30 dag']],
  ['woda 1,5 l', ['woda', '1,5 l']],
  ['chleb 500g', ['chleb', '500 g']],
  ['jajka 10 szt', ['jajka', '10 szt']],
  ['jajka 10 szt.', ['jajka', '10 szt']],     // the abbreviation dot is dropped
  ['szynka, 50 dag', ['szynka', '50 dag']],
  ['50 dag szynki', ['szynki', '50 dag']],    // leading, not only trailing
  ['1,5 l wody', ['wody', '1,5 l']],
  ['jogurt x6', ['jogurt', '6']],
  ['jogurt ×6', ['jogurt', '6']],
  ['ham 2 lb', ['ham', '2 lb']],
  ['eggs 12 pcs', ['eggs', '12 pcs']],
].forEach(([text, want]) => check(`  ${text}`, split(text), want));

section('amount — leave it alone when guessing would invent meaning');
[
  ['mleko 3,2%', ['mleko 3,2%', '']],        // a percentage is not a unit
  ['masło 82%', ['masło 82%', '']],
  ['2 mleka', ['2 mleka', '']],              // two cartons or two litres?
  ['chleb 7 dni', ['chleb 7 dni', '']],      // "dni" is not a unit
  ['mleko', ['mleko', '']],
  ['cola zero', ['cola zero', '']],
  ['50 dag', ['50 dag', '']],                // nothing would be left to buy
  ['1 kg', ['1 kg', '']],
  ['woda 1234567890123 kg', ['woda 1234567890123 kg', '']], // over the field cap
  ['', ['', '']],
].forEach(([text, want]) => check(`  ${JSON.stringify(text)}`, split(text), want));

// ============================================================================
//  Suggestions
// ============================================================================

section('history — matching');
record('mleko');
record('ser żółty');
record('sok jabłkowy');

check('  prefix of the whole name', suggest('mle'), ['mleko']);
check('  prefix of a later word', suggest('zol'), ['ser żółty']);
check('  phrase with a space', suggest('sok jab'), ['sok jabłkowy']);
check('  case and diacritics ignored', suggest('MLE'), ['mleko']);
check('  exact match is not suggested', suggest('mleko'), []);
check('  no match', suggest('xyz'), []);
check('  already on the list is excluded', suggest('mle', ['mleko']), []);

section('history — ranking by use');
record('kefir');
record('kefir naturalny');
record('kefir');            // twice, so it outranks the longer one
check('  more used first', suggest('kef'), ['kefir', 'kefir naturalny']);

// ============================================================================
//  Interface strings
// ============================================================================

section('i18n — plurals and parameters');
setLocalePreference('pl');
check('  pl 1', t('clear.done', { count: 1 }), 'Usunięto 1 produkt.');
check('  pl 2', t('clear.done', { count: 2 }), 'Usunięto 2 produkty.');
check('  pl 5', t('clear.done', { count: 5 }), 'Usunięto 5 produktów.');
check('  pl 22', t('clear.done', { count: 22 }), 'Usunięto 22 produkty.');
check('  pl parameter', t('item.removed', { name: 'mleko' }), 'Usunięto mleko.');

setLocalePreference('en');
check('  en 1', t('clear.done', { count: 1 }), 'Removed 1 item.');
check('  en 5', t('clear.done', { count: 5 }), 'Removed 5 items.');
check('  unknown key returns the key', t('nie.ma.takiego'), 'nie.ma.takiego');

// ============================================================================

console.log();
if (failures.length) {
  console.log(`${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.log(`FAIL ${f}\n`));
  process.exitCode = 1;
} else {
  console.log(`${passed} passed`);
}
