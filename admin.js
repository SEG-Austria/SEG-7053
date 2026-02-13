import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    setDoc, 
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

// Haupt-App für Admin-Check
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Zweit-App um neue User zu erstellen, ohne den Admin auszuloggen
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

function fakeEmail(username) {
    return username.toLowerCase().trim() + "@seg.local";
}

// --- Funktionen global verfügbar machen ---

window.createUser = async () => {
    const u = document.getElementById("newUsername").value.trim();
    const p = document.getElementById("newPassword").value;
    const r = document.getElementById("newRole").value;

    if (!u || !p) {
        alert("Username & Passwort fehlen");
        return;
    }

    try {
        // Erstellt den User in Auth (über die Secondary App)
        const cred = await createUserWithEmailAndPassword(secondaryAuth, fakeEmail(u), p);

        // Erstellt den User-Datensatz in Firestore
        await setDoc(doc(db, "users", cred.user.uid), {
            username: u,
            role: r,
            banned: false
        });

        alert(`User ${u} als ${r} erstellt ✔`);
        loadUsers();
    } catch (e) {
        alert("Fehler: " + e.message);
    }
};

// 🔐 Admin-Check & Initialisierung
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        document.body.innerHTML = "<h1>Zugriff verweigert</h1><p>Bitte logge dich zuerst ein.</p>";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || snap.data().role !== "Admin") {
        document.body.innerHTML = "<h1>Kein Admin ❌</h1><p>Du hast keine Berechtigung für diese Seite.</p>";
        return;
    }

    loadUsers();
});

// 📋 User-Liste laden
async function loadUsers() {
    const userList = document.getElementById("userList");
    if (!userList) return;
    
    userList.innerHTML = "Lade User...";
    
    try {
        const snap = await getDocs(collection(db, "users"));
        userList.innerHTML = "";

        snap.forEach(d => {
            const u = d.data();
            const roles = ["Rekrut", "Gräber", "Elite", "Admin"];
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${u.username}</td>
                <td>
                    <select onchange="window.setRole('${d.id}', this.value)">
                        ${roles.map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}
                    </select>
                </td>
                <td>${u.banned ? "🚫 Gesperrt" : "✅ Aktiv"}</td>
                <td>
                    <button onclick="window.toggleBan('${d.id}', ${u.banned})">${u.banned ? "Entsperren" : "Sperren"}</button>
                    <button onclick="window.removeUser('${d.id}')" style="color:red">Löschen</button>
                </td>
            `;
            userList.appendChild(row);
        });
    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }
}

window.setRole = async (uid, role) => {
    await updateDoc(doc(db, "users", uid), { role });
    loadUsers();
};

window.toggleBan = async (uid, bannedNow) => {
    await updateDoc(doc(db, "users", uid), { banned: !bannedNow });
    loadUsers();
};

window.removeUser = async (uid) => {
    if (confirm("User-Daten wirklich löschen? (Auth-Account bleibt bestehen)")) {
        await deleteDoc(doc(db, "users", uid));
        loadUsers();
    }
};
