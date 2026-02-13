import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

function fakeEmail(username) {
  return username + "@seg.local";
}

// 🟢 REGISTRIEREN
//window.register = async () => {
//  alert("Registration nur beim Besitzer und Web Administrator möglich.");
//};
window.register = async () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;

  const statusEl = document.getElementById("status");

  if (!u || !p) {
    statusEl.innerText = "Username oder Passwort fehlt ❌";
    return;
  }

  if (p.length < 6) {
    statusEl.innerText = "Passwort muss mind. 6 Zeichen haben ❌";
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

    statusEl.innerText = "Registriert ✔";
  } catch (e) {
    statusEl.innerText = e.code;
    console.error(e);
  }
};

// 🔵 LOGIN
window.login = async () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;
  const statusEl = document.getElementById("status");

  const email = u.toLowerCase() + "@seg.local";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, p);

    const snap = await getDoc(doc(db, "users", cred.user.uid));

    if (!snap.exists()) {
      statusEl.innerText = "Kein User-Datensatz ❌";
      return;
    }

    if (snap.data().banned) {
      statusEl.innerText = "Du bist gesperrt 🚫";
      return;
    }

    statusEl.innerText = "Login ✔ Rolle: " + snap.data().role;

  } catch (e) {
    statusEl.innerText = "Login fehlgeschlagen ❌";
    console.error(e.code);
  }
};


    const snap = await getDoc(doc(db, "users", cred.user.uid));
    status.innerText =
      "Login ✔ Rolle: " + snap.data().role;
  } catch (e) {
    status.innerText = "Login fehlgeschlagen ❌";
  }
};
