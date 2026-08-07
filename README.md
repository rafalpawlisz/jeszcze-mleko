# Jeszcze Mleko 🥛

A shared shopping list as a PWA. Everyone in the household joins with a single
code, and changes show up instantly for all of them.

- add and delete items
- items are filed into store departments automatically, by name
- check off what's bought, clear the bought ones in one tap
- live sync across devices
- interface in English or Polish, following the browser
- works offline and installs like an app

**Zero dependencies.** No `package.json`, no `node_modules`, no build step —
plain HTML/CSS/JS, with the Firebase SDK loaded as an ES module from a CDN. The
repository *is* what gets served.

---

## Setup, step by step

### 1. Firebase project

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. **Build → Authentication** → Get started → **Sign-in method** tab →
   enable **Anonymous**
3. **Build → Firestore Database** → Create database → **production** mode →
   pick a region (for Poland: `europe-central2` or `eur3`)
4. **Project settings** (⚙️) → *Your apps* → the `</>` (Web) icon →
   register the app → copy the `firebaseConfig` object
5. Paste the values into [`firebase-config.js`](firebase-config.js)

> A Firebase API key **is not a secret** — it identifies the project but
> authorizes nothing. Access is decided by the security rules and App Check. It
> can safely sit in a public repo.

It is still worth restricting it, since the repo is public: [Google Cloud Console
→ Credentials](https://console.cloud.google.com/apis/credentials) → the "Browser
key" → *Application restrictions* → **Websites**. The key then stops working if
pasted onto somebody else's page.

The patterns must be full URLs, **with the scheme and a trailing `/*`**, and the
dev port has to be spelled out:

```
http://localhost:8000/*
https://YOUR-USERNAME.github.io/*
```

Getting this wrong locks you out of your own app. A bare host, or a port
wildcard like `localhost:*`, does not match — sign-in then fails with
`auth/requests-from-referer-…-are-blocked`, and App Check starts returning 403
as well, because its token exchange uses the same key. Changes take a few
minutes to propagate; if you need to unblock yourself right now, set
*Application restrictions* back to **None**.

Note what this does and does not buy you. The `Referer` header is set by the
client, so `curl --referer` walks straight through it. This guards against
*casual* reuse of the key, not against a determined attacker — the actual
security boundary is the Firestore rules plus App Check.

Leave *API restrictions* in that same dialog alone. The app talks to several APIs
at once (Identity Toolkit, Firestore, App Check, Installations) and missing one of
them fails silently and is miserable to debug.

**The project id is public and has to be.** The browser sends it in every request
(`firestore.googleapis.com/v1/projects/<projectId>/…`), so anyone can read it out
of DevTools on the deployed page. Keeping it out of the repo would buy nothing.
Firebase is designed for this: the identifiers are open, and the rules and App
Check are what hold the line.

### 2. reCAPTCHA v3 + App Check

Anonymous sign-in means anyone can mint any number of accounts. App Check
attaches a token to every request proving the traffic comes from your app in a
real browser. reCAPTCHA v3 is invisible — the user never clicks anything.

1. [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin) → **+** →
   type **reCAPTCHA v3** → domains: `localhost` **and** `YOUR-USERNAME.github.io`
2. **Site key** → paste into `firebase-config.js` as `recaptchaSiteKey`
3. Firebase console → **Build → App Check** → *Apps* tab → your web app →
   **reCAPTCHA v3** → paste the **Secret key** → Save
4. Under the *APIs* tab register **Cloud Firestore** and **Authentication**, but
   **leave them unenforced** (monitoring mode). Enforcement gets switched on in
   step 6, once the metrics confirm everything works.

### 3. Security rules

Firestore Database → **Rules** tab → paste the whole contents of
[`firestore.rules`](firestore.rules) → **Publish**.

### 4. Running locally

The app is made of ES modules, so it cannot be opened over `file://` — it needs
an HTTP server. The repo ships [`serve.js`](serve.js), written purely against
Node's built-in modules (no `npm install`):

```bash
node serve.js
```

Then open `http://localhost:8000`. Any other static server works too, e.g.
`python -m http.server 8000`.

On the first local run the browser console prints an **App Check debug token**.
Copy it and register it: Firebase console → App Check → Apps → the ⋮ menu next to
the app → **Manage debug tokens** → Add.

> A debug token bypasses App Check — treat it like a password and never commit it.

### 5. Deploying to GitHub Pages

```bash
git init
git add .
git commit -m "Jeszcze Mleko"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/jeszcze-mleko.git
git push -u origin main
```

In the repository: **Settings → Pages** → *Source*: **Deploy from a branch** →
branch `main`, folder `/ (root)` → Save.

The app shows up at `https://YOUR-USERNAME.github.io/jeszcze-mleko/` shortly after.

Finally: Firebase console → **Authentication → Settings → Authorized domains** →
**Add domain** → `YOUR-USERNAME.github.io`.

### 6. Turning on App Check enforcement

Switch only once all of the following hold:

- the live GitHub Pages site works (real reCAPTCHA, not the debug token)
- every household device has opened the app at least once
- Firebase console → **App Check** → Metrics shows 100% *Verified* and 0%
  *Unverified* / *Outdated client*

Metrics aggregate with up to a day of delay, so realistically this is a day or two
after deploying. Switching back to unenforced takes effect immediately, so the
risk is low.

**Enforce Firestore first, and Authentication only days later — if at all.**
reCAPTCHA is routinely blocked by uBlock Origin, Brave Shields and strict privacy
modes. With Firestore enforced, such a person can still read the list but cannot
save changes: annoying. With Authentication enforced they cannot sign in at all,
which means losing the list entirely — the invite code will not bring them back.
If anyone in the household runs an aggressive blocker, consider leaving
Authentication in monitoring mode permanently.

From then on a script without a token is refused before it ever reaches the rules.

Note that once enforcement is on, local development only works thanks to the
registered debug token. Clearing site data on localhost makes the SDK mint a new
one, which then has to be registered again.

---

## How it works

### Firestore data

```
lists/{listId}              code, members: { uid: true }, createdAt, name?
lists/{listId}/items/{id}   name, dept, done, createdAt, amount?
codes/{CODE}                listId
```

`amount` is free text — "6", "50 dag", "1,5 l", "pół kilo" — and is written only
when there is something to say. Blank or a plain "1" mean one and are left out
entirely, so an ordinary item is exactly the document it was before amounts
existed. The row shows a badge only when the field is set: "mleko 1, chleb 1,
masło 1" would be noise rather than information. A bare number renders as "×6";
anything carrying its own unit is shown as typed.

Free text rather than a number and a unit picker, because a bare "50" cannot say
whether it means slices, grams or decagrams — and nothing here ever computes with
the value, so structure buys nothing. A unit list would also need localising, and
Polish "dag" has no everyday English equivalent.

Typing the amount into the name works too: "szynka 50 dag" is split into the item
"szynka" carrying "50 dag". A **unit is required** for that to happen, and that is
the entire safety margin — a bare number is genuinely ambiguous ("2 mleka" — two
cartons or two litres?) so it is left alone, and "mleko 3,2%" is untouched because
% is not a unit. Nothing is invented by the split: the amount only moves from the
name into its own field. An amount typed into the field wins over anything found
in the name.

It also keeps suggestions clean. Without the split, "szynka 50 dag" and "szynka
30 dag" would accumulate as two unrelated history entries rather than one
"szynka". See [`amount.js`](amount.js).

The field sits next to the name in the composer, empty by default. Capturing it at
add time is the point: that is when you know it. The two obvious alternatives are
worse — asking after each add breaks the burst-add loop the app is built around,
and putting it behind a tap on the row collides with the tap that checks an item
off, which is the most-used gesture in the shop.

`name` on a list is **optional**. It can be set in settings and is shared with
everyone on the list, but it is shown **only in that panel** — the heading stays
the app's own name, which is a proper noun and never translated. A list name is a
label you check occasionally, not something worth spending the header on.

An empty field removes the key rather than storing `""`, which the rules reject
anyway: absent is how "no name" is spelled. The field is saved on blur or Enter,
not per keystroke, and an incoming rename from another member is never applied
while this device has the field focused.

`codes` is a separate collection because someone joining is not yet allowed to
read the list document — they have to turn the code into a `listId` first, and
only then add themselves to `members`. The rules make sure they can add
**nobody but themselves**.

### Languages

The interface follows the browser: **Polish** when the browser asks for it,
**English** otherwise. It can be overridden by hand in settings (⚙️); the choice
is kept in `localStorage`.

All the strings live in [`i18n.js`](i18n.js). In the markup an element carries a
`data-i18n="key"` attribute (or `data-i18n-placeholder` / `data-i18n-aria-label` /
`data-i18n-title`), and the text in the file is the English default. Strings built
in code go through `t('key', { param })`. Plurals use `Intl.PluralRules`, so the
Polish 1 / 2–4 / 5+ forms come out right ("1 produkt", "2 produkty", "5 produktów").

Adding a language means adding one object to `STRINGS` and one code to `LOCALES`.

**The same list shows up for everyone in their own language** — including the
heading. An item stores a department id (`nabial`), not a label, and a list stores
no name at all; both are resolved at render time. Item names, of course, stay
exactly as somebody typed them.

### iOS and Safari

Safari needs a handful of things the other browsers do not, and getting them
wrong is mostly invisible until somebody actually uses an iPhone.

**The keyboard.** iOS does not shrink the layout viewport when the on-screen
keyboard appears, so a bottom-anchored composer simply ends up underneath it.
`visualViewport` reports the genuinely visible area; the difference is published
to CSS as `--keyboard` and reserved as padding on the list screen.

**Safe areas.** `viewport-fit=cover` lets the app paint under the notch and the
home indicator, and `env(safe-area-inset-*)` pays that back on the top bar, the
composer and the sheets — including left/right, which matter in landscape.

**Never below 16px in a field.** Safari zooms the whole page when a focused input
has a smaller font. All inputs are pinned to 16px for that reason alone.

**Home Screen icon and standalone mode.** Safari ignores the manifest for both,
hence the `apple-touch-icon` (180×180) and the `apple-mobile-web-app-*` tags.

**Storage eviction — the one that actually loses data.** iOS clears local storage
for sites left unopened for about a week. The anonymous session and the saved
list id live exactly there, so an occasional user of the app in Safari can come
back to an empty welcome screen. Adding the app to the Home Screen exempts it,
which is why the hint banner appears on iOS. It is also why the invite code is
worth writing down.

Everything above was verified in a Chromium-based browser. Layout, safe areas and
the keyboard logic behave the same there, but **the real Safari behaviour —
especially eviction and the Home Screen flow — can only be confirmed on a device**.

### Suggestions while typing

A household buys the same things over and over, so typing an item in full every
week is wasted effort. [`history.js`](history.js) remembers what has been added
and offers matches as a row of taps above the input.

The history lives in `localStorage`, **per device**. That needs no security
rules, no writes and no network — the trade-off is that each phone learns
separately. To stop a freshly joined device from starting empty, the first items
snapshot seeds the history with whatever is already on the shared list; seeded
names carry a zero count, so anything actually typed on this device outranks them.

Matching reuses `normalize()` from the department dictionary, so `zol` finds
"ser żółty" — a single word matches as a word prefix, a query with a space
matches anywhere. Ranking is by frequency, then recency. Names already on the
list are filtered out, since suggesting them would only create duplicates.

**Typos expire.** A name added exactly once and never again is most likely a
mistake, and the 200-entry cap will never be reached by a household list, so
without an expiry "sos pomidorowt" would be offered forever. One-off entries are
dropped after 60 days; anything used twice or more is treated as real and never
expires. Note this is cleanup rather than prevention — a fresh typo is still
suggested until it ages out, though a name bought regularly outranks it. The
complete answer would be to require a repeat before suggesting at all, which was
weighed and deliberately not taken: it would delay the feature's usefulness for
every genuinely new product.

Tapping a suggestion adds the item outright rather than filling the field: on a
phone the number of taps is what matters, and the department is derived from the
name anyway.

Deliberately not a `<datalist>`. It would have been a single attribute, but its
behaviour on iOS Safari cannot be verified from a development machine, and this
is the one control that has to work on a phone.

The three exported functions are the whole storage contract, so moving the
history into a shared Firestore document later means reimplementing them and
touching nothing else.

### Filing items into departments

[`departments.js`](departments.js) holds a dictionary of word **stems**, not full
forms — `mlek` catches mleko / mleka / mleczko, `tomato` catches tomatoes. The
name is normalized (lowercase, no Polish diacritics, no punctuation) and a stem
matches as a **word prefix**, so `por` does not match inside "pomidora". When
several stems match, the longest one wins — that is how `masło orzechowe` and
`peanut butter` end up in sweets rather than dairy.

Polish and English stems sit in the same lists, so on one shared list "papier
toaletowy" and "toilet paper" land in the same department.

Above the ordinary matching sits a short `DOMINANT_KEYWORDS` list — words that
define the category regardless of the rest of the name. Without it "mrożone
truskawki" would land in produce (because `truskawk` is longer than `mrozon`) and
"apple juice" would land in fruit instead of drinks.

The department is written into the item document at the moment it is added. A
later change to the dictionary will not reshuffle somebody's list mid-shop.

Checking something off takes it out of its department and into a single **Bought**
section at the very bottom. Once an item is in the basket its aisle stops
mattering, and the departments above then read as exactly what is still left to
find. The section is view-only — nothing about it is stored, and unchecking an
item sends it straight back to its department.

Want your own products in there? Add a stem to the right array in `KEYWORDS`.

---

## Things worth knowing

**An anonymous account lives in one browser.** Clearing site data, or moving to
another device, means losing access. The **invite code is the only way back** —
which is why it sits in settings (⚙️) and is worth writing down somewhere.

**Whoever knows the code has access.** Codes do not expire. If one leaks, the only
way out is creating a new list — there is deliberately no member management here.

**Leaving tidies up.** Leaving a list always removes your own key from `members`,
so an abandoned list does not keep listing people who are gone. If you are the
last member, the dialog additionally offers to delete the list, its items and its
code outright — nothing left behind. That offer only appears for the last member:
otherwise "tidying up after myself" would wipe the list somebody else is shopping
from. Deletion order is items, then code, then the list document, because the rule
guarding the code checks membership on a list that has to still exist at that
point.

**App Check is not a rate limiter.** It stops automated abuse, but it will not stop
someone who knows the code from adding a thousand items by hand. For a private
household list that is irrelevant. For peace of mind, set a **budget alert** on the
project in Google Cloud.

## Files

| File | Role |
|---|---|
| [`index.html`](index.html) | all the markup — three screens plus the settings sheet |
| [`app.js`](app.js) | auth, App Check, Firestore, sync, rendering |
| [`departments.js`](departments.js) | bilingual department dictionary and name matching |
| [`i18n.js`](i18n.js) | interface strings, language detection, plurals |
| [`history.js`](history.js) | per-device suggestion history behind three functions |
| [`amount.js`](amount.js) | splits a typed amount off the item name |
| [`app.css`](app.css) | styles, mobile-first, automatic dark mode |
| [`sw.js`](sw.js) | service worker — offline support and installability |
| [`firestore.rules`](firestore.rules) | rules to paste into the Firebase console |
| [`serve.js`](serve.js) | static server for local development |

## After changing any file

Bump `CACHE_VERSION` in [`sw.js`](sw.js). Without that the service worker keeps
serving the old version from cache.

While working locally it is easier to tick **Update on reload** under DevTools →
Application → Service Workers — then every refresh picks up fresh files and there
is no need to bump the version after each small edit.

If you bump the Firebase SDK version, change it in **two** places: the imports in
[`app.js`](app.js) and `SDK_VERSION` in [`sw.js`](sw.js).
