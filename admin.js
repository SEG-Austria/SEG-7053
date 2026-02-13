import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
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
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null;
    }
  }
}

window.createUser = async () => {
  const u = newUsername.value;
  const p = newPassword.value;
  const r = newRole.value;

  if (!u || !p) {
    alert("Username & Passwort fehlen");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      fakeEmail(u),
      p
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      username: u,
      role: r,
      banned: false
    });

    alert("User erstellt ✔");
    loadUsers();

  } catch (e) {
    alert(e.message);
  }
};

// 🔐 Prüfen ob Admin
onAuthStateChanged(auth, async user => {
  if (!user) {
    document.body.innerHTML = "Nicht eingeloggt ❌";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists() || snap.data().role !== "Admin") {
    document.body.innerHTML = "Kein Admin ❌ Zugriff verweigert";
    return;
  }

  loadUsers(); // erst jetzt!
});


// 📋 User laden
async function loadUsers() {
  userList.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {
    const u = d.data();

    userList.innerHTML += `
      <tr>
        <td>${u.username}</td>
        <td>
          <select onchange="setRole('${d.id}', this.value)">
            ${["Rekrut","Gräber","Elite","Admin"].map(r =>
              `<option ${u.role===r?"selected":""}>${r}</option>`
            ).join("")}
          </select>
        </td>
        <td>${u.banned ? "🚫" : "✅"}</td>
        <td>
          <button onclick="toggleBan('${d.id}', ${u.banned})">
            ${u.banned ? "Entsperren" : "Sperren"}
          </button>
          <button onclick="removeUser('${d.id}')">Löschen</button>
        </td>
      </tr>
    `;
  });
}

// 🧑‍🚀 Rolle ändern
window.setRole = async (uid, role) => {
  await updateDoc(doc(db, "users", uid), { role });
  loadUsers();
};

// 🚫 Sperren / Entsperren
window.toggleBan = async (uid, banned) => {
  await updateDoc(doc(db, "users", uid), { banned: !banned });
  loadUsers();
};

// 🗑️ Löschen (nur Daten, Auth bleibt)
window.removeUser = async uid => {
  if (confirm("User wirklich löschen?")) {
    await deleteDoc(doc(db, "users", uid));
    loadUsers();
  }
};
