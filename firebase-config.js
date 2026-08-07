// ============================================================================
//  FILL IN BEFORE THE FIRST RUN — step-by-step instructions in README.md
// ============================================================================
//
// These values are NOT secrets. A Firebase API key identifies the project, it
// does not authorize access — who may do what is decided by firestore.rules and
// App Check. They can safely live in a public repo.

export const firebaseConfig = {
  apiKey: "AIzaSyAh0wQRC0zJT1NAuk5PHGFPkuhGaqsINQw",
  authDomain: "jeszcze-mleko.firebaseapp.com",
  projectId: "jeszcze-mleko",
  storageBucket: "jeszcze-mleko.firebasestorage.app",
  messagingSenderId: "397373761185",
  appId: "1:397373761185:web:a87e3328b1b6986d2332e0"
};

// When an item matches no department, record its name in the `unmatched`
// collection so the dictionary can be improved from real usage. Only the name
// and a counter are stored — no uid, no list id — and the collection cannot be
// read by the app, only from the Firebase console.
//
// Worth a thought before leaving this on: the deployed page is public, so names
// typed by anyone who finds it land here too, not only your household's.
export const collectUnmatched = true;

// Site key from the reCAPTCHA console (type: reCAPTCHA v3). Not a secret either
// — the secret key is the one you paste only into the Firebase console.
export const recaptchaSiteKey = '6LfICHEtAAAAANyxphXi5wAaDtzt8Ryyhc1d3lDn';
