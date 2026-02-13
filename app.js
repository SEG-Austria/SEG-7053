import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
const auth = getAuth(app);
const db = getFirestore(app);

// Hilfsfunktion für Status-Anzeigen
function updateStatus(text) {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.innerText = text;
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
    updateStatus("Registriert ✔ Logge dich jetzt ein.");
  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      updateStatus("Name bereits vergeben ❌");
    } else {
      updateStatus("Fehler: " + e.code);
    }
  }
};

// 🔵 LOGIN mit Weiterleitung
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
      await signOut(auth);
      return;
    }

    updateStatus("Login erfolgreich! Leite weiter...");

    // Weiterleitungs-Logik nach Rolle
    setTimeout(() => {
      if (userData.role === "Admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }
    }, 800);

  } catch (e) {
    updateStatus("Login fehlgeschlagen ❌");
    console.error(e.code);
  }
};

// 🔴 LOGOUT Funktion (global nutzbar)
window.logout = async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (e) {
    console.error("Logout Fehler", e);
  }
};
