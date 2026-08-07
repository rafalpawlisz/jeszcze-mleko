// Minimal i18n: browser language detection, a manual override, and plural forms.
//
// English is the default and the fallback for every language we don't ship.
// Polish kicks in when the browser asks for it.

export const LOCALES = ['en', 'pl'];
export const DEFAULT_LOCALE = 'en';

const STORAGE_KEY = 'jeszcze-mleko:locale';

// A value is either a plain string or, when it depends on a count, an object
// keyed by CLDR plural categories. Polish needs one/few/many, English one/other.
const STRINGS = {
  en: {
    'app.tagline': 'A shared shopping list for the whole household.',

    'loading.connecting': 'Connecting…',
    'loading.signInFailed': 'Could not sign in. Please reload the page.',

    'welcome.create': 'Create a new list',
    'welcome.orJoin': 'or join an existing one',
    'welcome.codePlaceholder': 'CODE',
    'welcome.codeLabel': 'Invite code',
    'welcome.join': 'Join',
    'welcome.codeLength': 'The code is {n} characters long.',
    'welcome.noSuchList': 'No list with that code.',
    'welcome.lostAccess': 'That list is no longer available. Create a new one, or join with a code.',

    'list.settings': 'Settings',
    'list.offline': 'No connection — changes will sync later.',
    'list.empty': 'The list is empty. Add your first item below.',
    'list.addPlaceholder': 'Add an item…',
    'list.addLabel': 'Item name',
    'list.add': 'Add',
    'list.amountLabel': 'Amount',
    'list.suggestions': 'Suggestions',
    'list.gone': 'This list no longer exists.',
    'list.bought': 'Bought',
    'list.clearDoneCount': 'Clear bought ({count})',

    'item.delete': 'Delete {name}',
    'item.removed': 'Removed {name}.',
    'item.already': '{name} is already on the list.',
    'item.backOnList': '{name} is back on the list.',

    'clear.done': {
      one: 'Removed 1 item.',
      other: 'Removed {count} items.',
    },
    'action.undo': 'Undo',
    'action.undone': 'Restored.',

    'dialog.confirm': 'Confirm',
    'dialog.cancel': 'Cancel',

    'install.hint': 'Add to your Home Screen: Share → Add to Home Screen.',
    'install.dismiss': 'Dismiss',

    'settings.title': 'Settings',
    'settings.listName': 'List name',
    'settings.listNamePlaceholder': 'Unnamed',
    'settings.codeIntro': 'Invite code — share it so others can join this list:',
    'settings.copy': 'Copy',
    'settings.copied': 'Code copied.',
    'settings.copyManual': 'Copy the code manually.',
    'settings.warning': 'Your access is stored only in this browser. If you clear site data, this code is the only way back to the list — write it down somewhere.',
    'settings.language': 'Language',
    'settings.languageAuto': 'Automatic (browser)',
    'settings.leave': 'Leave list',
    'settings.leaveTitle': 'Leave this list?',
    'settings.leaveConfirm': 'It will be removed from this device only. You can come back with the invite code.',
    'settings.leaveDelete': 'You are the only member — also delete the list, its items and its code.',
    'settings.deleted': 'List deleted.',
    'settings.close': 'Close',

    'error.permissionDenied': 'Permission denied. Reload the page and try again.',
    'error.unavailable': 'No connection to the database. Check your network.',
    'error.resourceExhausted': 'Request limit exceeded. Try again in a moment.',
    'error.generic': 'Something went wrong.',
    'error.codeGeneration': 'Could not generate a free code.',

    'dept.warzywa': 'Fruit & vegetables',
    'dept.pieczywo': 'Bakery',
    'dept.nabial': 'Dairy',
    'dept.mieso': 'Meat & deli',
    'dept.ryby': 'Fish',
    'dept.mrozonki': 'Frozen',
    'dept.sypkie': 'Dry goods & pasta',
    'dept.konserwy': 'Canned & sauces',
    'dept.slodycze': 'Sweets & snacks',
    'dept.napoje': 'Drinks',
    'dept.alkohole': 'Alcohol',
    'dept.chemia': 'Household & hygiene',
    'dept.zdrowie': 'Health & supplements',
    'dept.dom': 'Home & pets',
    'dept.inne': 'Other',
  },

  pl: {
    'app.tagline': 'Wspólna lista zakupów dla całego domu.',

    'loading.connecting': 'Łączenie…',
    'loading.signInFailed': 'Nie udało się zalogować. Odśwież stronę.',

    'welcome.create': 'Utwórz nową listę',
    'welcome.orJoin': 'albo dołącz do istniejącej',
    'welcome.codePlaceholder': 'KOD',
    'welcome.codeLabel': 'Kod zaproszenia',
    'welcome.join': 'Dołącz',
    'welcome.codeLength': 'Kod ma {n} znaków.',
    'welcome.noSuchList': 'Nie ma listy o takim kodzie.',
    'welcome.lostAccess': 'Ta lista jest już niedostępna. Utwórz nową albo dołącz kodem.',

    'list.settings': 'Ustawienia',
    'list.offline': 'Brak sieci — zmiany zsynchronizują się później.',
    'list.empty': 'Lista jest pusta. Dodaj pierwszy produkt poniżej.',
    'list.addPlaceholder': 'Dodaj produkt…',
    'list.addLabel': 'Nazwa produktu',
    'list.add': 'Dodaj',
    'list.amountLabel': 'Ilość',
    'list.suggestions': 'Podpowiedzi',
    'list.gone': 'Lista już nie istnieje.',
    'list.bought': 'Kupione',
    'list.clearDoneCount': 'Wyczyść kupione ({count})',

    'item.delete': 'Usuń {name}',
    'item.removed': 'Usunięto {name}.',
    'item.already': '{name} jest już na liście.',
    'item.backOnList': '{name} wraca na listę.',

    'clear.done': {
      one: 'Usunięto 1 produkt.',
      few: 'Usunięto {count} produkty.',
      many: 'Usunięto {count} produktów.',
      other: 'Usunięto {count} produktów.',
    },
    'action.undo': 'Cofnij',
    'action.undone': 'Przywrócono.',

    'dialog.confirm': 'Potwierdź',
    'dialog.cancel': 'Anuluj',

    'install.hint': 'Dodaj do ekranu początkowego: Udostępnij → Do ekranu początkowego.',
    'install.dismiss': 'Zamknij',

    'settings.title': 'Ustawienia',
    'settings.listName': 'Nazwa listy',
    'settings.listNamePlaceholder': 'Bez nazwy',
    'settings.codeIntro': 'Kod zaproszenia — podaj go domownikom, żeby dołączyli do tej listy:',
    'settings.copy': 'Kopiuj',
    'settings.copied': 'Skopiowano kod.',
    'settings.copyManual': 'Skopiuj kod ręcznie.',
    'settings.warning': 'Twój dostęp jest zapisany tylko w tej przeglądarce. Jeśli wyczyścisz dane witryny, wrócisz na listę wyłącznie przez ten kod — zapisz go gdzieś na wszelki wypadek.',
    'settings.language': 'Język',
    'settings.languageAuto': 'Automatycznie (przeglądarka)',
    'settings.leave': 'Opuść listę',
    'settings.leaveTitle': 'Opuścić listę?',
    'settings.leaveConfirm': 'Zniknie tylko z tego urządzenia. Wrócisz na nią kodem zaproszenia.',
    'settings.leaveDelete': 'Jesteś jedynym członkiem — usuń też listę, jej produkty i kod.',
    'settings.deleted': 'Lista usunięta.',
    'settings.close': 'Zamknij',

    'error.permissionDenied': 'Brak uprawnień. Odśwież stronę i spróbuj ponownie.',
    'error.unavailable': 'Brak połączenia z bazą. Sprawdź sieć.',
    'error.resourceExhausted': 'Przekroczony limit zapytań. Spróbuj za chwilę.',
    'error.generic': 'Coś poszło nie tak.',
    'error.codeGeneration': 'Nie udało się wygenerować wolnego kodu.',

    'dept.warzywa': 'Warzywa i owoce',
    'dept.pieczywo': 'Pieczywo',
    'dept.nabial': 'Nabiał',
    'dept.mieso': 'Mięso i wędliny',
    'dept.ryby': 'Ryby',
    'dept.mrozonki': 'Mrożonki',
    'dept.sypkie': 'Sypkie i makarony',
    'dept.konserwy': 'Konserwy i sosy',
    'dept.slodycze': 'Słodycze i przekąski',
    'dept.napoje': 'Napoje',
    'dept.alkohole': 'Alkohole',
    'dept.chemia': 'Chemia i higiena',
    'dept.zdrowie': 'Zdrowie i suplementy',
    'dept.dom': 'Dom i zwierzęta',
    'dept.inne': 'Inne',
  },
};

// 'auto' means "follow the browser"; anything else is an explicit override.
//
// The preference is held here, in memory, and only *persisted* to localStorage.
// Reading it back from storage instead would mean that wherever storage is
// unavailable — private mode, blocked site data — choosing a language in
// settings silently did nothing at all.
function readStoredPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

function resolveLocale(pref) {
  if (LOCALES.includes(pref)) return pref;

  // navigator.languages is ordered by preference; take the first one we ship.
  const tags = navigator?.languages?.length ? navigator.languages : [navigator?.language];
  for (const tag of tags) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (LOCALES.includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}

let preference = readStoredPreference();
let locale = resolveLocale(preference);

export function getLocale() {
  return locale;
}

export function getLocalePreference() {
  return preference;
}

// preference: 'auto' | 'en' | 'pl'
export function setLocalePreference(next) {
  preference = LOCALES.includes(next) ? next : 'auto';

  try {
    if (preference === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Private mode without storage — the choice just won't survive a reload.
  }

  locale = resolveLocale(preference);
  // Guarded so the module can be exercised outside a browser, by test.js.
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
  return locale;
}

export function t(key, params = {}) {
  let value = STRINGS[locale]?.[key] ?? STRINGS[DEFAULT_LOCALE]?.[key];
  if (value === undefined) return key; // missing key is visible, not silent

  if (typeof value === 'object') {
    const category = new Intl.PluralRules(locale).select(params.count ?? 0);
    value = value[category] ?? value.other ?? key;
  }

  return String(value).replace(/\{(\w+)\}/g, (match, name) =>
    (name in params ? String(params[name]) : match));
}

// Translates everything marked up in the HTML. Attributes carry the key, so the
// markup stays the single source of truth for which element shows what.
export function applyTranslations(root = document) {
  const targets = [
    ['data-i18n', (node, text) => { node.textContent = text; }],
    ['data-i18n-placeholder', (node, text) => { node.placeholder = text; }],
    ['data-i18n-aria-label', (node, text) => node.setAttribute('aria-label', text)],
    ['data-i18n-title', (node, text) => { node.title = text; }],
  ];

  for (const [attribute, apply] of targets) {
    for (const node of root.querySelectorAll(`[${attribute}]`)) {
      apply(node, t(node.getAttribute(attribute)));
    }
  }

  document.documentElement.lang = locale;
}
