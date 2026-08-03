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
import { record, seed, suggest } from './history.js';
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
  suggestions: $('suggestions'),
  settings: $('settings'),
  settingsCode: $('settings-code'),
  btnCopyCode: $('btn-copy-code'),
  btnLeave: $('btn-leave'),
  btnCloseSettings: $('btn-close-settings'),
  selectLanguage: $('select-language'),
  toast: $('toast'),
  toastMessage: $('toast-message'),
  toastAction: $('toast-action'),
  dialog: $('dialog'),
  dialogTitle: $('dialog-title'),
  dialogMessage: $('dialog-message'),
  dialogConfirm: $('dialog-confirm'),
  dialogCancel: $('dialog-cancel'),
  installHint: $('install-hint'),
  btnDismissHint: $('btn-dismiss-hint'),
};

// The app name lives in the markup, not here, and is never translated — it is a
// proper noun. Captured before anything can overwrite the heading.
const APP_NAME = el.listTitle.textContent;

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

// action, when given, is { label, onClick } and turns the toast into the undo
// affordance — which is what lets destructive actions skip a confirmation.
function toast(message, action = null) {
  el.toastMessage.textContent = message;
  el.toastAction.hidden = !action;
  if (action) {
    el.toastAction.textContent = action.label;
    el.toastAction.onclick = () => {
      el.toast.hidden = true;
      clearTimeout(toastTimer);
      action.onClick();
    };
  }

  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, action ? 6000 : 2600);
}

// Promise-based replacement for confirm(). The native dialog on iOS shows the
// bare domain name and cannot be styled; <dialog> gives us Escape handling and
// focus trapping for free.
function confirmDialog({ title, message, confirmLabel }) {
  el.dialogTitle.textContent = title;
  el.dialogMessage.textContent = message;
  el.dialogConfirm.textContent = confirmLabel ?? t('dialog.confirm');

  return new Promise((resolve) => {
    el.dialog.addEventListener('close', () => {
      resolve(el.dialog.returnValue === 'confirm');
    }, { once: true });
    el.dialog.showModal();
    el.dialogCancel.focus(); // safer default than the destructive button
  });
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

async function leaveList() {
  const confirmed = await confirmDialog({
    title: t('settings.leaveTitle'),
    message: t('settings.leaveConfirm'),
    confirmLabel: t('settings.leave'),
  });
  if (!confirmed) return;

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
      el.listTitle.textContent = state.list.name || APP_NAME;
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

  let seeded = false;

  state.unsubscribeItems = onSnapshot(
    collection(db, 'lists', listId, 'items'),
    (snap) => {
      state.items = snap.docs.map((d) => ({
        id: d.id,
        pending: d.metadata.hasPendingWrites,
        ...d.data(),
      }));

      // First snapshot doubles as the seed for suggestions, so a device that has
      // just joined an existing list is not starting with an empty history.
      if (!seeded) {
        seeded = true;
        seed(state.items.map((item) => item.name));
      }

      renderItems();
    },
    (error) => console.error('Items subscription dropped', error),
  );
}

// ============================================================================
//  Rendering
// ============================================================================

const DEPARTMENT_ORDER = new Map(DEPARTMENTS.map((d, index) => [d.id, index]));

// Rows and headings are kept and reused, keyed by item id and department id.
//
// Rebuilding the list from scratch on every snapshot was the obvious first
// approach, but it is wrong in a live-synced app: a single added item produces
// two snapshots milliseconds apart (the local write, then the server
// confirmation), so a freshly created row was thrown away mid-animation. The
// same throw-away also drops keyboard focus and would make touch gestures
// impossible, because the element under the finger stops existing.
const itemNodes = new Map();
const deptNodes = new Map();

function renderItems() {
  const items = state.items;

  el.emptyState.hidden = items.length > 0;

  const doneCount = items.filter((item) => item.done).length;
  el.btnClearDone.hidden = doneCount === 0;
  el.btnClearDone.textContent = t('list.clearDoneCount', { count: doneCount });

  // Group by department, sort alphabetically, push bought items to the bottom
  // of their section.
  const groups = new Map();
  for (const item of items) {
    const dept = DEPARTMENT_ORDER.has(item.dept) ? item.dept : 'inne';
    if (!groups.has(dept)) groups.set(dept, []);
    groups.get(dept).push(item);
  }

  const orderedDepts = [...groups.keys()].sort(
    (a, b) => DEPARTMENT_ORDER.get(a) - DEPARTMENT_ORDER.get(b),
  );
  // Sorting follows the display language, so Polish diacritics land where a
  // Polish reader expects them.
  const collator = new Intl.Collator(getLocale());

  const desired = [el.emptyState];
  const liveIds = new Set();

  for (const dept of orderedDepts) {
    const group = groups.get(dept).sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return collator.compare(a.name, b.name);
    });

    desired.push(departmentHeading(dept, group.length));
    for (const item of group) {
      liveIds.add(item.id);
      desired.push(itemRow(item));
    }
  }

  // Forget nodes whose data is gone, otherwise the caches grow forever.
  for (const [id, node] of itemNodes) {
    if (!liveIds.has(id)) { node.remove(); itemNodes.delete(id); }
  }
  for (const [dept, node] of deptNodes) {
    if (!groups.has(dept)) { node.remove(); deptNodes.delete(dept); }
  }

  reorder(el.items, desired);
}

// Moves nodes into position rather than recreating them. Anything already in the
// right place is left untouched, so running animations and focus survive.
function reorder(parent, desired) {
  desired.forEach((node, index) => {
    if (parent.children[index] !== node) {
      parent.insertBefore(node, parent.children[index] ?? null);
    }
  });
  while (parent.children.length > desired.length) parent.lastElementChild.remove();
}

function departmentHeading(dept, count) {
  let node = deptNodes.get(dept);
  if (!node) {
    node = document.createElement('h2');
    node.className = 'dept-title';
    const label = document.createElement('span');
    const total = document.createElement('span');
    total.className = 'dept-count';
    node.append(label, total);
    deptNodes.set(dept, node);
  }

  const info = departmentInfo(dept);
  // The department id is language-neutral; the label is resolved per viewer.
  node.firstElementChild.textContent = `${info.icon} ${t(`dept.${info.id}`)}`;
  node.lastElementChild.textContent = count;
  return node;
}

function itemRow(item) {
  let node = itemNodes.get(item.id);
  const isNew = !node;

  if (isNew) {
    node = document.createElement('div');
    node.className = 'item is-new';
    node.dataset.id = item.id;

    const toggle = document.createElement('button');
    toggle.className = 'item-toggle';
    toggle.type = 'button';
    toggle.dataset.action = 'toggle';
    const box = document.createElement('span');
    box.className = 'checkbox';
    const name = document.createElement('span');
    name.className = 'item-name';
    toggle.append(box, name);

    const remove = document.createElement('button');
    remove.className = 'item-delete';
    remove.type = 'button';
    remove.dataset.action = 'delete';
    remove.textContent = '✕';

    node.append(toggle, remove);
    itemNodes.set(item.id, node);
  }

  const [toggle, remove] = node.children;
  const [box, name] = toggle.children;

  if (!isNew && node.classList.contains('done') !== !!item.done) {
    // Re-adding a class the element already had does nothing, so the animation
    // has to be knocked off and restarted with a forced reflow in between.
    node.classList.remove('just-toggled');
    void node.offsetWidth;
    node.classList.add('just-toggled');
  }

  node.classList.toggle('done', !!item.done);
  node.classList.toggle('pending', !!item.pending);
  toggle.setAttribute('aria-pressed', String(!!item.done));
  box.textContent = item.done ? '✓' : '';
  name.textContent = item.name; // textContent, not innerHTML — the name is data
  remove.setAttribute('aria-label', t('item.delete', { name: item.name }));

  return node;
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

  // Recorded before the write, not after: offline the addDoc promise stays
  // pending until the network returns, and suggestions should work offline too.
  record(name);

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

// Everything needed to put a deleted item back exactly as it was. The rules only
// accept these four fields, and createdAt is still null for a write that has not
// reached the server yet.
function backupOf(item) {
  return {
    id: item.id,
    data: {
      name: item.name,
      dept: item.dept,
      done: !!item.done,
      createdAt: item.createdAt ?? serverTimestamp(),
    },
  };
}

async function removeItem(item) {
  const backup = backupOf(item);

  try {
    await deleteDoc(doc(itemsCollection(), item.id));
    // The delete button sits right next to the row and is easy to hit by
    // accident, so it gets the same safety net as clearing bought items.
    toast(t('item.removed', { name: item.name }), {
      label: t('action.undo'),
      onClick: () => restoreItems([backup]),
    });
  } catch (error) {
    console.error('Could not delete the item', error);
    toast(describeError(error));
  }
}

async function clearDone() {
  // Filtered locally — we already hold the full snapshot, no need to ask again.
  const done = state.items.filter((item) => item.done);
  if (done.length === 0) return;

  // No confirmation dialog: the action happens straight away and is undoable for
  // a few seconds. A prompt people click through blindly protects nobody.
  const backup = done.map(backupOf);

  try {
    await inBatches(done, (batch, item) => batch.delete(doc(itemsCollection(), item.id)));
    toast(t('clear.done', { count: done.length }), {
      label: t('action.undo'),
      onClick: () => restoreItems(backup),
    });
  } catch (error) {
    console.error('Clearing the list failed', error);
    toast(describeError(error));
  }
}

async function restoreItems(backup) {
  try {
    // Restored under the original ids, so anyone else's screen sees the rows
    // reappear exactly where they were.
    await inBatches(backup, (batch, entry) =>
      batch.set(doc(itemsCollection(), entry.id), entry.data));
    toast(t('action.undone'));
  } catch (error) {
    console.error('Restoring items failed', error);
    toast(describeError(error));
  }
}

// writeBatch takes at most 500 operations, so anything bigger is split up.
async function inBatches(entries, apply) {
  for (let i = 0; i < entries.length; i += 400) {
    const batch = writeBatch(db);
    for (const entry of entries.slice(i, i + 400)) apply(batch, entry);
    await batch.commit();
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

// ============================================================================
//  Suggestions
// ============================================================================

function renderSuggestions() {
  const names = suggest(el.inputItem.value, state.items.map((item) => item.name));

  el.suggestions.hidden = names.length === 0;
  el.suggestions.replaceChildren(...names.map((name) => {
    const chip = document.createElement('button');
    chip.className = 'suggestion';
    chip.type = 'button';
    chip.textContent = name;
    return chip;
  }));
}

function clearSuggestions() {
  el.suggestions.hidden = true;
  el.suggestions.replaceChildren();
}

// Changing the language re-translates the markup and re-renders the list, since
// department headings and the sort order both depend on it.
function changeLanguage(preference) {
  setLocalePreference(preference);
  applyTranslations();
  if (state.list) el.listTitle.textContent = state.list.name || APP_NAME;
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
  clearSuggestions();
  addItem(value);
});

el.inputItem.addEventListener('input', renderSuggestions);

// One tap adds the item outright instead of filling the field: on a phone the
// number of taps is what matters, and the department is derived from the name.
el.suggestions.addEventListener('click', (event) => {
  const chip = event.target.closest('.suggestion');
  if (!chip) return;

  el.inputItem.value = '';
  el.inputItem.focus();
  clearSuggestions();
  addItem(chip.textContent);
});

// One delegated listener instead of two per row: rows are now long-lived, and
// this way nothing has to be rebound when they are reused.
el.items.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const id = button.closest('.item')?.dataset.id;
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;

  if (button.dataset.action === 'toggle') toggleItem(item);
  else removeItem(item);
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

// <dialog> closes itself on Escape; these just record which button was used.
el.dialogConfirm.addEventListener('click', () => el.dialog.close('confirm'));
el.dialogCancel.addEventListener('click', () => el.dialog.close('cancel'));

el.btnDismissHint.addEventListener('click', () => {
  el.installHint.hidden = true;
  try { localStorage.setItem(HINT_KEY, '1'); } catch { /* private mode */ }
});

// ============================================================================
//  iOS quirks, network state and service worker
// ============================================================================

const HINT_KEY = 'jeszcze-mleko:hintDismissed';

// iOS does not shrink the layout viewport when the keyboard appears, so a
// bottom-anchored composer ends up hidden underneath it. visualViewport reports
// the actually visible area; the difference is handed to CSS as --keyboard.
if (window.visualViewport) {
  const viewport = window.visualViewport;
  const updateKeyboardInset = () => {
    const covered = window.innerHeight - (viewport.height + viewport.offsetTop);
    document.documentElement.style.setProperty(
      '--keyboard', `${Math.max(0, Math.round(covered))}px`);
  };
  viewport.addEventListener('resize', updateKeyboardInset);
  viewport.addEventListener('scroll', updateKeyboardInset);
  updateKeyboardInset();
}

// Safari has no install prompt — adding to the Home Screen is a manual gesture
// nobody discovers on their own. It matters more than looks here: iOS evicts
// storage for sites left unopened for a week, and an installed app is exempt,
// so this hint is what keeps the anonymous session from quietly disappearing.
function maybeShowInstallHint() {
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;

  let dismissed = false;
  try { dismissed = localStorage.getItem(HINT_KEY) === '1'; } catch { /* private mode */ }

  el.installHint.hidden = !(isIOS && !isStandalone && !dismissed);
}
maybeShowInstallHint();

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
