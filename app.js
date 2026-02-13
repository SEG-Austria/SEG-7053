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
window.register = async () => {
  const u = username.value;
  const p = password.value;

  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      fakeEmail(u),
      p
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      username: u,
      role: "Rekrut"
    });

    status.innerText = "Registriert ✔ Rolle: Rekrut";
  } catch (e) {
    status.innerText = e.message;
  }
};

// 🔵 LOGIN
window.login = async () => {
  const u = username.value;
  const p = password.value;

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      fakeEmail(u),
      p
    );

    const snap = await getDoc(doc(db, "users", cred.user.uid));
    status.innerText =
      "Login ✔ Rolle: " + snap.data().role;
  } catch (e) {
    status.innerText = "Login fehlgeschlagen ❌";
  }
};
