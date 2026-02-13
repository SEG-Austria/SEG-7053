import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
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

// --- INITIALISIERUNG ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Zweit-App für User-Erstellung ohne Admin-Logout
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

const roles = [
    "Anfänger", 
    "Schlechter Arbeiter", 
    "Mittelmäßiger Arbeiter", 
    "Guter Arbeiter", 
    "Bester Arbeiter", 
    "General", 
    "Co-Anführer", 
    "Anführer", 
    "Krank / Vorübergehend nicht verfügbar", 
    "Admin"
];

const statusOptions = [
    "Anwesend", 
    "Abwesend (Entschuldigt)", 
    "Abwesend (Unentschuldigt)"
];

function fakeEmail(username) {
    return username.toLowerCase().trim() + "@seg.local";
}

// --- FUNKTIONEN ---

// 1. User-Liste laden
async function loadUsers() {
    const userList = document.getElementById("userList");
    if (!userList) return;

    userList.innerHTML = "<tr><td colspan='5'>Lade Daten...</td></tr>";

    try {
        const snap = await getDocs(collection(db, "users"));
        userList.innerHTML = ""; 

        snap.forEach(d => {
            const u = d.data();
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td>${u.username || "Unbekannt"}</td>
                <td>
                    <select onchange="window.setRole('${d.id}', this.value)">
                        ${roles.map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}
                    </select>
                </td>
                <td>
                    <select onchange="window.setStatus('${d.id}', this.value)">
                        ${statusOptions.map(s => `<option value="${s}" ${u.status === s ? "selected" : ""}>${s}</option>`).join("")}
                    </select>
                </td>
                <td>${u.banned ? "🚫 Gesperrt" : "✅ Aktiv"}</td>
                <td>
                    <button onclick="window.toggleBan('${d.id}', ${u.banned})">
                        ${u.banned ? "Entsperren" : "Sperren"}
                    </button>
                    <button onclick="window.removeUser('${d.id}')" style="color:red; margin-left:10px; background:none; border:1px solid red; cursor:pointer;">Löschen</button>
                </td>
            `;
            userList.appendChild(row);
        });
    } catch (e) {
        console.error(e);
        userList.innerHTML = "<tr><td colspan='5'>Fehler: " + e.message + "</td></tr>";
    }
}

// 2. Neuen User erstellen
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
            status: "Anwesend",
            banned: false
        });

        alert(`User ${uEl.value} erfolgreich erstellt!`);
        uEl.value = "";
        pEl.value = "";
        loadUsers();
    } catch (e) {
        alert("Fehler beim Erstellen: " + e.message);
    }
};

// 3. Rolle ändern
window.setRole = async (uid, newRole) => {
    try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
        console.log("Rolle aktualisiert auf:", newRole);
    } catch (e) {
        alert("Fehler: " + e.message);
    }
};

// 4. Status ändern (Anwesenheit)
window.setStatus = async (uid, newStatus) => {
    try {
        await updateDoc(doc(db, "users", uid), { status: newStatus });
        console.log("Status aktualisiert auf:", newStatus);
    } catch (e) {
        alert("Fehler: " + e.message);
    }
};

// 5. Sperren / Entsperren
window.toggleBan = async (uid, isBanned) => {
    try {
        await updateDoc(doc(db, "users", uid), { banned: !isBanned });
        loadUsers();
    } catch (e) {
        alert("Fehler: " + e.message);
    }
};

// 6. User löschen
window.removeUser = async (uid) => {
    if (confirm("Diesen User wirklich unwiderruflich löschen?")) {
        try {
            await deleteDoc(doc(db, "users", uid));
            loadUsers();
        } catch (e) {
            alert("Fehler: " + e.message);
        }
    }
};

// 7. Logout
window.logout = async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (e) {
        alert("Logout fehlgeschlagen!");
    }
};

// --- AUTH CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || snap.data().role !== "Admin") {
        document.body.innerHTML = "<h2 style='color:red; text-align:center; margin-top:50px;'>Kein Admin-Zugriff!</h2>";
        setTimeout(() => window.location.href = "dashboard.html", 2000);
        return;
    }

    loadUsers(); 
});
