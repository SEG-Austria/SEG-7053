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
    "Abwesend (Unentschuldigt)",
    "Keine Schicht" // Neu hinzugefügt
];;

function fakeEmail(username) {
    return username.toLowerCase().trim() + "@seg.local";
}

// --- FUNKTIONEN ---

// 1. User-Liste laden
async function loadMembers() {
    const list = document.getElementById("memberList");
    if (!list) return;

    try {
        const snap = await getDocs(collection(db, "users"));
        let members = [];
        
        snap.forEach(d => {
            const u = d.data();
            if (!u.banned) {
                members.push({ ...u, id: d.id });
            }
        });

        // --- SORTIERUNG ---
        // Anwesend kommt nach oben, dann Keine Schicht, dann Abwesend
        members.sort((a, b) => {
            const order = { "Anwesend": 1, "Keine Schicht": 2, "Abwesend (Entschuldigt)": 3, "Abwesend (Unentschuldigt)": 4 };
            return (order[a.status] || 5) - (order[b.status] || 5);
        });

        list.innerHTML = "";
        
        members.forEach(u => {
            const safeClass = u.role ? u.role.split(' ')[0] : "Rekrut";
            
            // --- FARB-LOGIK ---
            let statusText = u.status || "Anwesend";
            let statusColor = "#99cc00"; // Grün (Standard)

            if (statusText === "Keine Schicht") {
                statusColor = "#33b5e5"; // Hellblau
            } else if (statusText.includes("Entschuldigt")) {
                statusColor = "#ffbb33"; // Gelb
            } else if (statusText.includes("Unentschuldigt")) {
                statusColor = "#ff4444"; // Rot
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${u.username || "Unbekannt"}</td>
                <td><span class="role-badge ${safeClass}">${u.role || "Rekrut"}</span></td>
                <td><span style="color: ${statusColor};">● ${statusText}</span></td>
            `;
            list.appendChild(row);
        });
    } catch (e) {
        console.error("Listen-Fehler:", e);
        list.innerHTML = "<tr><td colspan='3'>Fehler beim Laden.</td></tr>";
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
