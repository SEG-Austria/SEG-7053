import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxwD04ZcxDjKkzCjIGXtGOJsewkAdNg50",
  authDomain: "seg-austria.firebaseapp.com",
  projectId: "seg-austria",
  storageBucket: "seg-austria.firebasestorage.app",
  messagingSenderId: "101261189931",
  appId: "1:101261189931:web:4f6b5bd9008f5f64bd1b6e",
  measurementId: "G-C0QLYYD6Q5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// 🟢 REGISTRIEREN
window.register = async () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;
  const statusEl = document.getElementById("status");

  if (!u || !p) {
    if (statusEl) statusEl.innerText = "Username oder Passwort fehlt ❌";
    return;
  }

  if (p.length < 6) {
    if (statusEl) statusEl.innerText = "Passwort muss mind. 6 Zeichen haben ❌";
    return;
  }

  const email = u.toLowerCase() + "@seg.local";

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, p);
    await setDoc(doc(db, "users", cred.user.uid), {
      username: u,
      role: "Rekrut",
      banned: false
    });
    if (statusEl) statusEl.innerText = "Registriert ✔";
  } catch (e) {
    if (statusEl) statusEl.innerText = "Fehler: " + e.code;
    console.error(e);
  }
};

// 🔵 LOGIN
window.login = async () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;
  const statusEl = document.getElementById("status");

  if (!u || !p) {
    if (statusEl) statusEl.innerText = "Bitte Daten eingeben ❌";
    return;
  }

  const email = u.toLowerCase() + "@seg.local";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, p);
    const snap = await getDoc(doc(db, "users", cred.user.uid));

    if (!snap.exists()) {
      if (statusEl) statusEl.innerText = "Kein User-Datensatz ❌";
      return;
    }

    if (snap.data().banned) {
      if (statusEl) statusEl.innerText = "Du bist gesperrt 🚫";
      return;
    }

    if (statusEl) statusEl.innerText = "Login ✔ Rolle: " + snap.data().role;
  } catch (e) {
    if (statusEl) statusEl.innerText = "Login fehlgeschlagen ❌";
    console.error(e.code);
  }
};

// HIER DARF NICHTS MEHR STEHEN (keine losen Klammern oder doppelter Code)
