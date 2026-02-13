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

// --- Hilfsfunktion für Status-Updates ---
function updateStatus(text) {
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.innerText = text;
  } else {
    console.log("Status-Update:", text);
  }
}

// 🟢 REGISTRIEREN
window.register = async () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;

  if (!u || !p) {
    updateStatus("Username oder Passwort fehlt ❌");
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
    updateStatus("Registriert ✔");
  } catch (e) {
    updateStatus("Fehler: " + e.code);
    console.error(e);
  }
};

// 🔵 LOGIN
window.login = async () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;

  if (!u || !p) {
    updateStatus("Bitte Daten eingeben ❌");
    return;
  }

  const email = u.toLowerCase() + "@seg.local";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, p);
    const snap = await getDoc(doc(db, "users", cred.user.uid));

    if (!snap.exists()) {
      updateStatus("Kein User-Datensatz ❌");
      return;
    }

    const userData = snap.data();
    if (userData.banned) {
      updateStatus("Du bist gesperrt 🚫");
      return;
    }

    updateStatus("Login ✔ Rolle: " + userData.role);
  } catch (e) {
    updateStatus("Login fehlgeschlagen ❌");
    console.error("Login Error:", e.code);
  }
  Object.assign(window, { register, login });
};
