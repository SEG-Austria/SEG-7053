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
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ... (ganz unten in der Datei)

window.logout = async () => {
    try {
        await signOut(auth); // auth ist bereits oben in deiner admin.js definiert
        window.location.href = "index.html";
    } catch (e) {
        console.error("Logout Fehler:", e);
        alert("Abmelden fehlgeschlagen!");
    }
};
// --- INITIALISIERUNG ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Zweit-App für User-Erstellung ohne Admin-Logout
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

function fakeEmail(username) {
    return username.toLowerCase().trim() + "@seg.local";
}

// --- FUNKTIONEN ---

// 1. Neuen User erstellen
window.createUser = async () => {
    const uEl = document.getElementById("newUsername");
    const pEl = document.getElementById("newPassword");
    const rEl = document.getElementById("newRole");

    if (!uEl.value || !pEl.value) {
        alert("Username & Passwort fehlen!");
        return;
    }

    try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, fakeEmail(uEl.value), pEl.value);
        await setDoc(doc(db, "users", cred.user.uid), {
            username: uEl.value,
            role: rEl.value,
            banned: false
        });

        alert(`User ${uEl.value} erfolgreich erstellt! ✔`);
        uEl.value = "";
        pEl.value = "";
        loadUsers();
    } catch (e) {
        alert("Fehler: " + e.message);
    }
};

// 2. User-Liste laden
async function loadUsers() {
    const userList = document.getElementById("userList");
    if (!userList) return;

    userList.innerHTML = "<tr><td colspan='4'>Lade Daten...</td></tr>";

    try {
        const snap = await getDocs(collection(db, "users"));
        userList.innerHTML = ""; 

        snap.forEach(d => {
            const u = d.data();
            const roles = ["Rekrut", "Gräber", "Elite", "Admin"];
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${u.username || "Unbekannt"}</td>
                <td>
                    <select onchange="window.setRole('${d.id}', this.value)">
                        ${roles.map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}
                    </select>
                </td>
                <td>${u.banned ? "🚫 Gesperrt" : "✅ Aktiv"}</td>
                <td>
                    <button onclick="window.toggleBan('${d.id}', ${u.banned})">
                        ${u.banned ? "Entsperren" : "Sperren"}
                    </button>
                    <button onclick="window.removeUser('${d.id}')" style="color:red; margin-left:10px;">Löschen</button>
                </td>
            `;
            userList.appendChild(row);
        });
    } catch (e) {
        console.error(e);
        userList.innerHTML = "<tr><td colspan='4'>Fehler: " + e.message + "</td></tr>";
    }
}

// 3. Rolle ändern
window.setRole = async (uid, newRole) => {
    try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
        console.log("Rolle aktualisiert");
    } catch (e) {
        alert("Fehler: " + e.message);
    }
};

// 4. Sperren / Entsperren
window.toggleBan = async (uid, isBanned) => {
    try {
        await updateDoc(doc(db, "users", uid), { banned: !isBanned });
        loadUsers();
    } catch (e) {
        alert("Fehler: " + e.message);
    }
};

// 5. User löschen
window.removeUser = async (uid) => {
    if (confirm("Diesen User wirklich aus der Datenbank löschen?")) {
        try {
            await deleteDoc(doc(db, "users", uid));
            loadUsers();
        } catch (e) {
            alert("Fehler: " + e.message);
        }
    }
};

// --- AUTH CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        document.body.innerHTML = "<h2 style='color:red'>Zugriff verweigert. Bitte erst einloggen!</h2>";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || snap.data().role !== "Admin") {
        document.body.innerHTML = "<h2 style='color:red'>Kein Admin-Zugriff für: " + (snap.data()?.username || "unbekannt") + "</h2>";
        return;
    }

    loadUsers(); 
});
