// Suggestion history: product names this device has added before.
//
// Deliberately per-device (localStorage) rather than shared through Firestore —
// it needs no security rules, no writes and no network, and seed() keeps a fresh
// device from starting empty by borrowing what is already on the shared list.
//
// These three functions are the entire storage contract. Moving the history into
// Firestore later means reimplementing them and nothing else.

import { normalize } from './departments.js';

const STORAGE_KEY = 'jeszcze-mleko:history';
const MAX_ENTRIES = 200;
const MAX_SUGGESTIONS = 4;

// key (normalized name) -> { name, count, usedAt }
let entries = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Map(Object.entries(JSON.parse(raw))) : new Map();
  } catch {
    // Private mode, or a payload from an older version. Suggestions are a
    // convenience, so failing to read them must never break anything.
    return new Map();
  }
}

function save() {
  // Frequent first, then recent. Anything past the cap is not worth keeping.
  const kept = [...entries.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.usedAt - a.usedAt)
    .slice(0, MAX_ENTRIES);

  entries = new Map(kept);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // Quota exceeded or storage unavailable — best effort, nothing to report.
  }
}

// Called on every add, so the ranking follows what this household actually buys.
export function record(name) {
  const key = normalize(name);
  if (!key) return;

  const existing = entries.get(key);
  entries.set(key, {
    name,                                  // keep the latest spelling used
    count: (existing?.count ?? 0) + 1,
    usedAt: Date.now(),
  });
  save();
}

// Names already on the shared list, added with a zero count: they rank below
// anything actually typed here, but a brand new device still has suggestions.
export function seed(names) {
  let changed = false;

  for (const name of names) {
    const key = normalize(name);
    if (!key || entries.has(key)) continue;
    entries.set(key, { name, count: 0, usedAt: 0 });
    changed = true;
  }

  if (changed) save();
}

// A single-word query matches as a word PREFIX, so "zol" finds "ser żółty" and
// not only names starting with it. A query with a space matches anywhere.
export function suggest(query, alreadyOnList = []) {
  const q = normalize(query);
  if (!q) return [];

  const taken = new Set(alreadyOnList.map(normalize));

  return [...entries.entries()]
    .filter(([key]) => {
      if (key === q || taken.has(key)) return false; // no duplicates, no echo
      return q.includes(' ')
        ? key.includes(q)
        : key.split(' ').some((word) => word.startsWith(q));
    })
    .sort(([, a], [, b]) => b.count - a.count || b.usedAt - a.usedAt)
    .slice(0, MAX_SUGGESTIONS)
    .map(([, entry]) => entry.name);
}
