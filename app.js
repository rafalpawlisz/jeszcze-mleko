import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app-check.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

import { firebaseConfig, recaptchaSiteKey } from './firebase-config.js';
import { DEPARTMENTS, departmentInfo, guessDepartment } from './departments.js';
import {
  t,
  getLocale,
  getLocalePreference,
  setLocalePreference,
  applyTranslations,
} from './i18n.js';

// ============================================================================
//  Initialization
// ============================================================================

const app = initializeApp(firebaseConfig);

// App Check MUST start before auth and Firestore — otherwise the earliest
// requests go out without a token and get rejected once enforcement is on.
//
// On localhost the SDK generates a debug token and logs it to the console; it
// has to be registered once in the Firebase console (App Check -> Apps -> Manage
// debug tokens). A debug token bypasses the protection, so treat it like a
// password and never commit it.
const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if (isLocalhost) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(recaptchaSiteKey),
  isTokenAutoRefreshEnabled: true,
});

const auth = getAuth(app);

// The IndexedDB cache gives us offline support and an instant start from local
// data. The multi-tab manager keeps several open tabs from fighting over it.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// ============================================================================
//  State
// ============================================================================

const STORAGE_KEY = 'jeszcze-mleko:listId';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L — nothing to misread
const CODE_LENGTH = 6;

const state = {
  uid: null,
  listId: null,
  list: null,
  items: [],
  unsubscribeList: null,
  unsubscribeItems: null,
};

// ============================================================================
//  DOM references
// ============================================================================

const $ = (id) => document.getElementById(id);

const el = {
  screenLoading: $('screen-loading'),
  screenWelcome: $('screen-welcome'),
  screenList: $('screen-list'),
  loadingText: $('loading-text'),
  btnCreate: $('btn-create'),
  formJoin: $('form-join'),
  inputCode: $('input-code'),
  welcomeError: $('welcome-error'),
  listTitle: $('list-title'),
  btnClearDone: $('btn-clear-done'),
  btnSettings: $('btn-settings'),
  offlineBanner: $('offline-banner'),
  items: $('items'),
  emptyState: $('empty-state'),
  formAdd: $('form-add'),
  inputItem: $('input-item'),
  settings: $('settings'),
  settingsCode: $('settings-code'),
  btnCopyCode: $('btn-copy-code'),
  btnLeave: $('btn-leave'),
  btnCloseSettings: $('btn-close-settings'),
  selectLanguage: $('select-language'),
  toast: $('toast'),
};

// The markup ships English defaults; swap them for the detected language before
// anything is shown.
applyTranslations();
el.selectLanguage.value = getLocalePreference();

function showScreen(name) {
  el.screenLoading.hidden = name !== 'loading';
  el.screenWelcome.hidden = name !== 'welcome';
  el.screenList.hidden = name !== 'list';
}

let toastTimer = null;
function toast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2600);
}

function showWelcomeError(message) {
  el.welcomeError.textContent = message;
  el.welcomeError.hidden = !message;
}

// Plain messages for the user instead of raw Firebase error codes.
function describeError(error) {
  switch (error?.code) {
    case 'permission-denied':
      return t('error.permissionDenied');
    case 'unavailable':
      return t('error.unavailable');
    case 'resource-exhausted':
      return t('error.resourceExhausted');
    default:
      return error?.message || t('error.generic');
  }
}

// ============================================================================
//  Anonymous sign-in
// ============================================================================

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  state.uid = user.uid;

  const savedListId = localStorage.getItem(STORAGE_KEY);
  if (savedListId) {
    openList(savedListId);
  } else {
    showScreen('welcome');
  }
});

signInAnonymously(auth).catch((error) => {
  console.error('Sign-in failed', error);
  el.loadingText.textContent = t('loading.signInFailed');
});

// ============================================================================
//  Creating and joining lists
// ============================================================================

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

async function createList() {
  el.btnCreate.disabled = true;
  showWelcomeError('');

  try {
    // The list id is generated locally so the code can be reserved first. If the
    // code cannot be claimed, we do not leave an orphaned list document behind.
    const listRef = doc(collection(db, 'lists'));

    let code = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = randomCode();
      const existing = await getDoc(doc(db, 'codes', candidate));
      if (existing.exists()) continue;
      await setDoc(doc(db, 'codes', candidate), { listId: listRef.id });
      code = candidate;
      break;
    }
    if (!code) throw new Error(t('error.codeGeneration'));

    await setDoc(listRef, {
      // Deliberately no 'name': the heading is then translated on every device
      // instead of being frozen in whatever language the creator happened to
      // use. The field stays optional in the rules for a future rename feature.
      code,
      members: { [state.uid]: true },
      createdAt: serverTimestamp(),
    });

    openList(listRef.id);
  } catch (error) {
    console.error('Creating the list failed', error);
    showWelcomeError(describeError(error));
  } finally {
    el.btnCreate.disabled = false;
  }
}

async function joinList(rawCode) {
  const code = rawCode.trim().toUpperCase();
  if (code.length !== CODE_LENGTH) {
    showWelcomeError(t('welcome.codeLength', { n: CODE_LENGTH }));
    return;
  }

  showWelcomeError('');
  try {
    const codeSnap = await getDoc(doc(db, 'codes', code));
    if (!codeSnap.exists()) {
      showWelcomeError(t('welcome.noSuchList'));
      return;
    }

    const { listId } = codeSnap.data();
    // The rules only allow adding yourself to members, nobody else.
    await updateDoc(doc(db, 'lists', listId), { [`members.${state.uid}`]: true });
    openList(listId);
  } catch (error) {
    console.error('Joining failed', error);
    showWelcomeError(describeError(error));
  }
}

function leaveList() {
  if (!confirm(t('settings.leaveConfirm'))) return;

  state.unsubscribeList?.();
  state.unsubscribeItems?.();
  state.unsubscribeList = null;
  state.unsubscribeItems = null;
  state.listId = null;
  state.list = null;
  state.items = [];

  localStorage.removeItem(STORAGE_KEY);
  closeSettings();
  showScreen('welcome');
}

// ============================================================================
//  Live sync
// ============================================================================

function openList(listId) {
  state.listId = listId;
  localStorage.setItem(STORAGE_KEY, listId);
  showScreen('list');

  state.unsubscribeList?.();
  state.unsubscribeItems?.();

  state.unsubscribeList = onSnapshot(
    doc(db, 'lists', listId),
    (snap) => {
      if (!snap.exists()) {
        toast(t('list.gone'));
        localStorage.removeItem(STORAGE_KEY);
        showScreen('welcome');
        return;
      }
      state.list = snap.data();
      el.listTitle.textContent = state.list.name || t('list.defaultName');
      el.settingsCode.textContent = state.list.code || '------';
    },
    (error) => {
      console.error('List subscription dropped', error);
      // Most likely cause: this device is no longer a member of the list.
      if (error.code === 'permission-denied') {
        localStorage.removeItem(STORAGE_KEY);
        showScreen('welcome');
        showWelcomeError(t('welcome.lostAccess'));
      }
    },
  );

  state.unsubscribeItems = onSnapshot(
    collection(db, 'lists', listId, 'items'),
    (snap) => {
      state.items = snap.docs.map((d) => ({
        id: d.id,
        pending: d.metadata.hasPendingWrites,
        ...d.data(),
      }));
      renderItems();
    },
    (error) => console.error('Items subscription dropped', error),
  );
}

// ============================================================================
//  Rendering
// ============================================================================

const DEPARTMENT_ORDER = new Map(DEPARTMENTS.map((d, index) => [d.id, index]));

function renderItems() {
  const items = state.items;

  el.emptyState.hidden = items.length > 0;
  el.btnClearDone.hidden = !items.some((item) => item.done);

  // Group by department, sort alphabetically, push bought items to the bottom
  // of their section.
  const groups = new Map();
  for (const item of items) {
    const dept = DEPARTMENT_ORDER.has(item.dept) ? item.dept : 'inne';
    if (!groups.has(dept)) groups.set(dept, []);
    groups.get(dept).push(item);
  }

  const fragment = document.createDocumentFragment();
  const orderedDepts = [...groups.keys()].sort(
    (a, b) => DEPARTMENT_ORDER.get(a) - DEPARTMENT_ORDER.get(b),
  );
  // Sorting follows the display language, so Polish diacritics land where a
  // Polish reader expects them.
  const collator = new Intl.Collator(getLocale());

  for (const dept of orderedDepts) {
    const info = departmentInfo(dept);
    const heading = document.createElement('h2');
    heading.className = 'dept-title';
    // The department id is language-neutral; the label is resolved per viewer.
    heading.textContent = `${info.icon} ${t(`dept.${info.id}`)}`;
    fragment.append(heading);

    const sorted = groups.get(dept).sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return collator.compare(a.name, b.name);
    });
    for (const item of sorted) fragment.append(renderItem(item));
  }

  // Full re-render: a household list is a few dozen entries, so this is the
  // simplest approach that always matches the state of the database.
  el.items.replaceChildren(el.emptyState, fragment);
}

function renderItem(item) {
  const row = document.createElement('div');
  row.className = 'item';
  if (item.done) row.classList.add('done');
  if (item.pending) row.classList.add('pending');

  const toggle = document.createElement('button');
  toggle.className = 'item-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', String(!!item.done));

  const box = document.createElement('span');
  box.className = 'checkbox';
  box.textContent = item.done ? '✓' : '';

  const name = document.createElement('span');
  name.className = 'item-name';
  name.textContent = item.name; // textContent, not innerHTML — the name is data

  toggle.append(box, name);
  toggle.addEventListener('click', () => toggleItem(item));

  const remove = document.createElement('button');
  remove.className = 'item-delete';
  remove.type = 'button';
  remove.textContent = '✕';
  remove.setAttribute('aria-label', t('item.delete', { name: item.name }));
  remove.addEventListener('click', () => removeItem(item));

  row.append(toggle, remove);
  return row;
}

// ============================================================================
//  Item operations
// ============================================================================

function itemsCollection() {
  return collection(db, 'lists', state.listId, 'items');
}

async function addItem(rawName) {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (!name || !state.listId) return;

  // The department is resolved once, when the item is added, and stored on the
  // document. If the dictionary changes later, nobody's list gets reshuffled
  // in the middle of a shopping trip.
  try {
    await addDoc(itemsCollection(), {
      name,
      dept: guessDepartment(name),
      done: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Could not add the item', error);
    toast(describeError(error));
  }
}

async function toggleItem(item) {
  try {
    await updateDoc(doc(itemsCollection(), item.id), { done: !item.done });
  } catch (error) {
    console.error('Could not toggle the item', error);
    toast(describeError(error));
  }
}

async function removeItem(item) {
  try {
    await deleteDoc(doc(itemsCollection(), item.id));
  } catch (error) {
    console.error('Could not delete the item', error);
    toast(describeError(error));
  }
}

async function clearDone() {
  // Filtered locally — we already hold the full snapshot, no need to ask again.
  const done = state.items.filter((item) => item.done);
  if (done.length === 0) return;

  if (!confirm(t('clear.confirm', { count: done.length }))) return;

  try {
    // writeBatch takes at most 500 operations, so we split into chunks.
    for (let i = 0; i < done.length; i += 400) {
      const batch = writeBatch(db);
      for (const item of done.slice(i, i + 400)) {
        batch.delete(doc(itemsCollection(), item.id));
      }
      await batch.commit();
    }
    toast(t('clear.done', { count: done.length }));
  } catch (error) {
    console.error('Clearing the list failed', error);
    toast(describeError(error));
  }
}

// ============================================================================
//  Settings
// ============================================================================

function openSettings() { el.settings.hidden = false; }
function closeSettings() { el.settings.hidden = true; }

async function copyCode() {
  const code = state.list?.code;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    toast(t('settings.copied'));
  } catch {
    // The clipboard can be blocked (no HTTPS, permission denied) — in that case
    // select the code so it can at least be copied by hand.
    const range = document.createRange();
    range.selectNodeContents(el.settingsCode);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    toast(t('settings.copyManual'));
  }
}

// Changing the language re-translates the markup and re-renders the list, since
// department headings and the sort order both depend on it.
function changeLanguage(preference) {
  setLocalePreference(preference);
  applyTranslations();
  if (state.list) el.listTitle.textContent = state.list.name || t('list.defaultName');
  renderItems();
}

// ============================================================================
//  Event wiring
// ============================================================================

el.btnCreate.addEventListener('click', createList);

el.formJoin.addEventListener('submit', (event) => {
  event.preventDefault();
  joinList(el.inputCode.value);
});

el.inputCode.addEventListener('input', () => {
  el.inputCode.value = el.inputCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

el.formAdd.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = el.inputItem.value;
  el.inputItem.value = '';
  el.inputItem.focus(); // keeps the keyboard up — easier to add items in a row
  addItem(value);
});

el.btnClearDone.addEventListener('click', clearDone);
el.btnSettings.addEventListener('click', openSettings);
el.btnCloseSettings.addEventListener('click', closeSettings);
el.btnCopyCode.addEventListener('click', copyCode);
el.btnLeave.addEventListener('click', leaveList);
el.selectLanguage.addEventListener('change', () => changeLanguage(el.selectLanguage.value));

el.settings.addEventListener('click', (event) => {
  if (event.target === el.settings) closeSettings(); // click on the backdrop closes
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !el.settings.hidden) closeSettings();
});

// ============================================================================
//  Network state and service worker
// ============================================================================

function updateOfflineBanner() {
  el.offlineBanner.hidden = navigator.onLine;
}
addEventListener('online', updateOfflineBanner);
addEventListener('offline', updateOfflineBanner);
updateOfflineBanner();

if ('serviceWorker' in navigator) {
  // Relative path — on GitHub Pages the app lives under /repo-name/.
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  });
}
