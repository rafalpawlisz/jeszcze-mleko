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
  deleteField,
  onSnapshot,
  increment,
  serverTimestamp,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

import { firebaseConfig, recaptchaSiteKey, collectUnmatched } from './firebase-config.js';
import {
  DEPARTMENTS,
  FALLBACK_DEPARTMENT,
  departmentInfo,
  emojiFor,
  guessDepartment,
  normalize,
} from './departments.js';
import { record, seed, suggest } from './history.js';
import { splitAmount, AMOUNT_MAX } from './amount.js';
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
const NAME_MAX = 60;      // both mirrored in firestore.rules and in the field's
const FEEDBACK_MAX = 1000; // maxlength, neither of which can import anything
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
  btnClearDone: $('btn-clear-done'),
  btnSettings: $('btn-settings'),
  offlineBanner: $('offline-banner'),
  items: $('items'),
  emptyState: $('empty-state'),
  formAdd: $('form-add'),
  inputItem: $('input-item'),
  inputAmount: $('input-amount'),
  suggestions: $('suggestions'),
  settings: $('settings'),
  settingsCode: $('settings-code'),
  inputListName: $('input-list-name'),
  btnCopyCode: $('btn-copy-code'),
  btnLeave: $('btn-leave'),
  btnCloseSettings: $('btn-close-settings'),
  selectLanguage: $('select-language'),
  inputFeedback: $('input-feedback'),
  btnSendFeedback: $('btn-send-feedback'),
  dialogExtra: $('dialog-extra'),
  dialogCheckbox: $('dialog-checkbox'),
  dialogCheckboxLabel: $('dialog-checkbox-label'),
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

// The heading is the app's own name, set once in the markup and never touched
// from here: it is a proper noun, so it is not translated, and the list's own
// name deliberately lives in settings instead of replacing it.

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
  // Unhidden before the text is written: a live region that is display:none when
  // its content changes may never be announced, and undo is the only protection
  // left now that destructive actions ask for no confirmation.
  el.toast.hidden = false;

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

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, action ? 6000 : 2600);
}

// Promise-based replacement for confirm(). The native dialog on iOS shows the
// bare domain name and cannot be styled; <dialog> gives us Escape handling and
// focus trapping for free.
// Set while a dialog is open; every way out of the dialog goes through it.
let settleDialog = null;

// Resolves to { confirmed, checked }. The optional checkbox lets one dialog carry
// a secondary decision instead of chaining two prompts.
//
// Deliberately not driven by the dialog's own 'close' event: it was measured not
// to fire in every engine even though close() had plainly run, which left the
// promise pending forever. The buttons and the Escape key resolve this directly.
function confirmDialog({ title, message, confirmLabel, checkbox = null }) {
  el.dialogTitle.textContent = title;
  el.dialogMessage.textContent = message;
  el.dialogConfirm.textContent = confirmLabel ?? t('dialog.confirm');

  el.dialogExtra.hidden = !checkbox;
  el.dialogCheckbox.checked = false; // never carry a choice over from last time
  if (checkbox) el.dialogCheckboxLabel.textContent = checkbox.label;

  return new Promise((resolve) => {
    settleDialog = (confirmed) => {
      settleDialog = null;
      const checked = el.dialogCheckbox.checked;
      if (el.dialog.open) el.dialog.close();
      resolve({ confirmed, checked });
    };

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
  // Offering to delete everything is only safe for the last member — otherwise
  // "tidying up after myself" would wipe the list somebody else is shopping from.
  const isLastMember = Object.keys(state.list?.members ?? {}).length <= 1;

  const { confirmed, checked } = await confirmDialog({
    title: t('settings.leaveTitle'),
    message: t('settings.leaveConfirm'),
    confirmLabel: t('settings.leave'),
    checkbox: isLastMember ? { label: t('settings.leaveDelete') } : null,
  });
  if (!confirmed) return;

  // Captured before detaching, which clears them.
  const listId = state.listId;
  const uid = state.uid;
  const code = state.list?.code;
  const items = state.items;

  // Detach first. The moment we stop being a member the list listener would fail
  // with permission-denied and announce lost access, which is not what happened.
  detachList();

  try {
    if (isLastMember && checked) {
      await deleteList(listId, code, items);
      toast(t('settings.deleted'));
    } else {
      await updateDoc(doc(db, 'lists', listId), { [`members.${uid}`]: deleteField() });
    }
  } catch (error) {
    console.error('Leaving the list failed', error);
    toast(describeError(error));
  }

  localStorage.removeItem(STORAGE_KEY);
  closeSettings();
  showScreen('welcome');
}

// Order matters. The rule guarding the code checks membership on the list, so the
// list document has to still exist at that point — items, then code, then list.
async function deleteList(listId, code, items) {
  const itemsRef = collection(db, 'lists', listId, 'items');
  await inBatches(items, (batch, item) => batch.delete(doc(itemsRef, item.id)));
  if (code) await deleteDoc(doc(db, 'codes', code));
  await deleteDoc(doc(db, 'lists', listId));
}

function detachList() {
  state.unsubscribeList?.();
  state.unsubscribeItems?.();
  state.unsubscribeList = null;
  state.unsubscribeItems = null;
  state.listId = null;
  state.list = null;
  state.items = [];

  // Reused rows belong to the list we just left; keeping them would leak into
  // whichever list is opened next.
  itemNodes.clear();
  deptNodes.clear();
  el.items.replaceChildren(el.emptyState);
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
      el.settingsCode.textContent = state.list.code || '------';

      // The name belongs to the list and is shared, so another member renaming
      // it shows up here — but never while this device is mid-edit, or the
      // field would be yanked out from under the person typing.
      if (document.activeElement !== el.inputListName) {
        el.inputListName.value = state.list.name ?? '';
      }
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
    // Without includeMetadataChanges a write that only the server acknowledges
    // never produces another snapshot — and confirming a write is exactly that.
    // Rows checked off would keep the "pending" dimming forever, since flipping
    // `done` changes no data on the way back. Adding an item hid the problem:
    // there the server also resolves createdAt, which is a real data change.
    { includeMetadataChanges: true },
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
  // Visually just a broom and a number; the wording that explains it goes to
  // assistive tech and to the desktop tooltip.
  const clearLabel = t('list.clearDoneCount', { count: doneCount });
  el.btnClearDone.textContent = `🧹 ${doneCount}`;
  el.btnClearDone.setAttribute('aria-label', clearLabel);
  el.btnClearDone.title = clearLabel;

  // Bought items leave their department entirely and collect in one section at
  // the very bottom: once something is in the basket its aisle no longer matters,
  // and the remaining departments should read as what is still left to find.
  const groups = new Map();
  const bought = [];

  for (const item of items) {
    if (item.done) {
      bought.push(item);
      continue;
    }
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

  const byName = (a, b) => collator.compare(a.name, b.name);

  const pushSection = (heading, group) => {
    desired.push(heading);
    for (const item of group) {
      liveIds.add(item.id);
      desired.push(itemRow(item));
    }
  };

  for (const dept of orderedDepts) {
    const group = groups.get(dept).sort(byName);
    const info = departmentInfo(dept);
    // The department id is language-neutral; the label is resolved per viewer.
    pushSection(
      sectionHeading(dept, `${info.icon} ${t(`dept.${info.id}`)}`, group.length),
      group,
    );
  }

  if (bought.length > 0) {
    pushSection(
      sectionHeading(BOUGHT_SECTION, `✅ ${t('list.bought')}`, bought.length, true),
      bought.sort(byName),
    );
  }

  // Forget nodes whose data is gone, otherwise the caches grow forever.
  for (const [id, node] of itemNodes) {
    if (!liveIds.has(id)) { node.remove(); itemNodes.delete(id); }
  }
  for (const [key, node] of deptNodes) {
    const stillUsed = key === BOUGHT_SECTION ? bought.length > 0 : groups.has(key);
    if (!stillUsed) { node.remove(); deptNodes.delete(key); }
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

// Reserved key for the bought section. Not a department: departments are ids
// stored in documents, and this one exists only in the view.
const BOUGHT_SECTION = '__bought__';

function sectionHeading(key, text, count, isBought = false) {
  let node = deptNodes.get(key);
  if (!node) {
    node = document.createElement('h2');
    node.className = isBought ? 'dept-title is-bought' : 'dept-title';
    const label = document.createElement('span');
    const total = document.createElement('span');
    total.className = 'dept-count';
    node.append(label, total);
    deptNodes.set(key, node);
  }

  node.firstElementChild.textContent = text;
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
    const icon = document.createElement('span');
    icon.className = 'item-emoji';
    icon.setAttribute('aria-hidden', 'true'); // decorative; the name says what it is
    const name = document.createElement('span');
    name.className = 'item-name';
    const amount = document.createElement('span');
    amount.className = 'item-amount';
    toggle.append(box, icon, name, amount);

    const remove = document.createElement('button');
    remove.className = 'item-delete';
    remove.type = 'button';
    remove.dataset.action = 'delete';
    remove.textContent = '✕';

    node.append(toggle, remove);
    itemNodes.set(item.id, node);
  }

  const [toggle, remove] = node.children;
  const [box, icon, name, amount] = toggle.children;

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
  // Recomputed rather than stored: it changes nothing about where the row sits,
  // so improving the dictionary improves lists that already exist.
  icon.textContent = emojiFor(item.name);
  name.textContent = item.name; // textContent, not innerHTML — the name is data
  // A bare number reads better with a multiplication sign ("×6"); anything that
  // carries its own unit is shown exactly as it was typed ("50 dag").
  amount.hidden = !item.amount;
  amount.textContent = /^\d+$/.test(item.amount ?? '') ? `×${item.amount}` : (item.amount ?? '');
  remove.setAttribute('aria-label', t('item.delete', { name: item.name }));

  return node;
}

// ============================================================================
//  Item operations
// ============================================================================

function itemsCollection() {
  return collection(db, 'lists', state.listId, 'items');
}

// Free text rather than a number: "50" on its own cannot say whether it means
// slices, grams or decagrams, and nothing here ever computes with the value.
// Blank or a plain "1" mean one, and one is left out of the document entirely,
// so an ordinary item is byte-for-byte what it was before amounts existed.
function amountFrom(raw) {
  // trim after slicing too: cutting at the cap can land on a space, and a value
  // ending in one would be stored and rendered with it.
  const amount = String(raw ?? '').trim().replace(/\s+/g, ' ').slice(0, AMOUNT_MAX).trim();
  return amount && amount !== '1' ? { amount } : {};
}

// Records a name that matched no department, so the dictionary can be improved
// from what people actually type. Aggregated by normalized name with a counter,
// so the collection stays small and the frequent gaps stand out.
//
// Fire-and-forget: this is housekeeping, and it must never delay or fail the
// thing the user actually asked for.
function reportUnmatched(name) {
  if (!collectUnmatched) return;

  const key = normalize(name);
  if (!key) return;

  // Nothing here identifies anyone: no uid, no list id. The rules make the
  // collection write-only, so the app cannot read back what anyone typed.
  setDoc(doc(db, 'unmatched', key), {
    name,
    count: increment(1),
    lastSeen: serverTimestamp(),
  }, { merge: true }).catch((error) => {
    console.warn('Could not record an uncategorised name', error);
  });
}

async function addItem(rawName, rawAmount) {
  // People type "szynka 50 dag" in one go rather than reaching for the amount
  // field, so an amount with a unit is lifted out of the name. Only when the
  // field was left empty — a value typed there is an explicit choice and wins.
  const typed = amountFrom(rawAmount).amount;
  const split = typed ? { name: rawName, amount: '' } : splitAmount(rawName);

  const name = split.name.trim().replace(/\s+/g, ' ');
  if (!name || !state.listId) return;

  // The split name is what goes into history, so "szynka 50 dag" and
  // "szynka 30 dag" converge on one suggestion instead of piling up as two.
  record(name);

  // One row per product. Suggestions already refuse to offer something that is
  // on the list; adding it by hand should not quietly produce a second row
  // either — you would check one off and the other would stay.
  const existing = state.items.find((item) => normalize(item.name) === normalize(name));
  if (existing) {
    reuseExisting(existing, typed || split.amount);
    return;
  }

  // The department is resolved once, when the item is added, and stored on the
  // document. If the dictionary changes later, nobody's list gets reshuffled
  // in the middle of a shopping trip.
  const dept = guessDepartment(name);
  if (dept === FALLBACK_DEPARTMENT) reportUnmatched(name);

  try {
    await addDoc(itemsCollection(), {
      name,
      dept,
      done: false,
      createdAt: serverTimestamp(),
      ...amountFrom(typed || split.amount),
    });
  } catch (error) {
    console.error('Could not add the item', error);
    toast(describeError(error));
  }
}

// Typing something that is already there is a request for that item, not for a
// second row. If it was already bought, adding it again plainly means it is
// needed once more, so it comes back to the list. An amount given now replaces
// the old one; a blank amount is no opinion and leaves it alone.
async function reuseExisting(item, rawAmount) {
  const patch = {};
  if (item.done) patch.done = false;

  const wanted = amountFrom(rawAmount).amount;
  if (wanted && wanted !== item.amount) patch.amount = wanted;

  flash(item.id);
  toast(t(item.done ? 'item.backOnList' : 'item.already', { name: item.name }));

  if (Object.keys(patch).length === 0) return;
  try {
    await updateDoc(doc(itemsCollection(), item.id), patch);
  } catch (error) {
    console.error('Could not update the existing item', error);
    toast(describeError(error));
  }
}

// Says where the item already is, rather than only saying that it is.
function flash(id) {
  const node = itemNodes.get(id);
  if (!node) return;

  node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  node.classList.remove('flash');
  void node.offsetWidth; // restart the animation if it is already running
  node.classList.add('flash');
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
      ...amountFrom(item.amount),
    },
  };
}

async function removeItem(item) {
  const backup = backupOf(item);
  // Captured now, not read again when Undo is tapped: the six-second window is
  // long enough to leave this list, and restoring into whichever list happens to
  // be open then would put the item somewhere it never was.
  const itemsRef = itemsCollection();

  try {
    await deleteDoc(doc(itemsRef, item.id));
    // The delete button sits right next to the row and is easy to hit by
    // accident, so it gets the same safety net as clearing bought items.
    toast(t('item.removed', { name: item.name }), {
      label: t('action.undo'),
      onClick: () => restoreItems(itemsRef, [backup]),
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
  const itemsRef = itemsCollection(); // see removeItem: the target must not drift

  try {
    await inBatches(done, (batch, item) => batch.delete(doc(itemsRef, item.id)));
    toast(t('clear.done', { count: done.length }), {
      label: t('action.undo'),
      onClick: () => restoreItems(itemsRef, backup),
    });
  } catch (error) {
    console.error('Clearing the list failed', error);
    toast(describeError(error));
  }
}

async function restoreItems(itemsRef, backup) {
  try {
    // Restored under the original ids, so anyone else's screen sees the rows
    // reappear exactly where they were.
    await inBatches(backup, (batch, entry) =>
      batch.set(doc(itemsRef, entry.id), entry.data));
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

// The sheet claims aria-modal, so the rest of the screen has to actually become
// inert — otherwise Tab still walks through the list behind it and a screen
// reader is told something untrue about the page.
function openSettings() {
  el.settings.hidden = false;
  el.screenList.inert = true;
  // The sheet itself, not the name field: focusing a text input here would open
  // the keyboard on a phone every time somebody opens settings to copy the code.
  el.settings.firstElementChild.focus();
}

function closeSettings() {
  el.settings.hidden = true;
  el.screenList.inert = false;
}

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

// Sent to a create-only collection, so nobody can read, edit or delete anybody
// else's. The locale rides along because it says which wording the person was
// actually looking at; nothing else is attached, which is what the note under
// the field promises.
async function sendFeedback() {
  // Trimmed again after slicing, for the same reason as the name and the amount:
  // a cut landing on a space would otherwise be sent along with it.
  const message = el.inputFeedback.value.trim().slice(0, FEEDBACK_MAX).trim();
  if (!message) return;

  el.btnSendFeedback.disabled = true;
  try {
    await addDoc(collection(db, 'feedback'), {
      message,
      locale: getLocale(),
      createdAt: serverTimestamp(),
    });
    el.inputFeedback.value = '';
    toast(t('settings.feedbackSent'));
  } catch (error) {
    console.error('Could not send feedback', error);
    toast(describeError(error));
  } finally {
    el.btnSendFeedback.disabled = false;
  }
}

// Changing the language re-translates the markup and re-renders the list, since
// department headings and the sort order both depend on it.
function changeLanguage(preference) {
  setLocalePreference(preference);
  applyTranslations();
  renderItems();
}

// Saved on blur or Enter rather than on every keystroke — a rename is a rare,
// deliberate act and does not need a write per character.
async function renameList() {
  if (!state.listId) return;

  // Trimmed again after slicing: a cut landing on a space would otherwise store
  // one. Same reasoning as amountFrom; the cap is repeated in the rules and in
  // the field's maxlength, which cannot import anything.
  const name = el.inputListName.value.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX).trim();
  if (name === (state.list?.name ?? '')) return; // nothing actually changed

  try {
    // An empty field removes the field entirely rather than storing "", which
    // the rules reject anyway: absent is how "no name" is spelled.
    await updateDoc(doc(db, 'lists', state.listId), {
      name: name ? name : deleteField(),
    });
  } catch (error) {
    console.error('Renaming the list failed', error);
    toast(describeError(error));
    el.inputListName.value = state.list?.name ?? ''; // put back what is stored
  }
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
  const amount = el.inputAmount.value;
  el.inputItem.value = '';
  el.inputAmount.value = '';
  el.inputItem.focus(); // keeps the keyboard up — easier to add items in a row
  clearSuggestions();
  addItem(value, amount);
});

el.inputItem.addEventListener('input', renderSuggestions);

// One tap adds the item outright instead of filling the field: on a phone the
// number of taps is what matters, and the department is derived from the name.
el.suggestions.addEventListener('click', (event) => {
  const chip = event.target.closest('.suggestion');
  if (!chip) return;

  // An amount typed before reaching for a suggestion still applies to it.
  const amount = el.inputAmount.value;
  el.inputItem.value = '';
  el.inputAmount.value = '';
  el.inputItem.focus();
  clearSuggestions();
  addItem(chip.textContent, amount);
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
el.inputListName.addEventListener('change', renameList); // fires on blur and on Enter
el.btnSendFeedback.addEventListener('click', sendFeedback);
el.btnLeave.addEventListener('click', leaveList);
el.selectLanguage.addEventListener('change', () => changeLanguage(el.selectLanguage.value));

el.settings.addEventListener('click', (event) => {
  if (event.target === el.settings) closeSettings(); // click on the backdrop closes
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  // The dialog sits on top of the settings sheet, so it gets the key first.
  if (el.dialog.open) settleDialog?.(false);
  else if (!el.settings.hidden) closeSettings();
});

el.dialogConfirm.addEventListener('click', () => settleDialog?.(true));
el.dialogCancel.addEventListener('click', () => settleDialog?.(false));
// Escape on a modal dialog dismisses it natively before our keydown handler can
// see it in some engines; 'cancel' is the other place that has to settle it.
el.dialog.addEventListener('cancel', () => settleDialog?.(false));

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
