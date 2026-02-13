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
    appId: "1:101261189931:web:4f6b5bd9008f5f64bd1b6e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

const roles = [
    "Anfänger", "Schlechter Arbeiter", "Mittelmäßiger Arbeiter", 
    "Guter Arbeiter", "Bester Arbeiter", "General", 
    "Co-Anführer", "Anführer", "Krank / Vorübergehend nicht verfügbar", "Admin"
];

const statusOptions = [
    "Anwesend", 
    "Abwesend (Entschuldigt)", 
    "Abwesend (Unentschuldigt)",
    "Keine Schicht"
];

// --- FUNKTIONEN ZUERST DEFINIEREN ---

async function loadUsers() {
    const userList = document.getElementById("userList");
    if (!userList) return;

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
                    <button onclick="window.toggleBan('${d.id}', ${u.banned})">${u.banned ? "Entsperren" : "Sperren"}</button>
                    <button onclick="window.removeUser('${d.id}')" style="color:red; margin-left:5px; background:none; border:1px solid red; cursor:pointer;">X</button>
                </td>
            `;
            userList.appendChild(row);
        });
    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }
}

// --- GLOBALE WINDOW-ZOWEISUNGEN ---

window.createUser = async () => {
    const uEl = document.getElementById("newUsername");
    const pEl = document.getElementById("newPassword");
    const rEl = document.getElementById("newRole");
    if (!uEl.value || !pEl.value) return alert("Daten fehlen!");

    try {
        const email = uEl.value.toLowerCase().trim() + "@seg.local";
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pEl.value);
        await setDoc(doc(db, "users", cred.user.uid), {
            username: uEl.value,
            role: rEl.value,
            status: "Anwesend",
            banned: false
        });
        uEl.value = ""; pEl.value = "";
        loadUsers();
    } catch (e) { alert(e.message); }
};

window.setRole = async (uid, newRole) => {
    try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
    } catch (e) { console.error(e); }
};

window.setStatus = async (uid, newStatus) => {
    try {
        await updateDoc(doc(db, "users", uid), { status: newStatus });
    } catch (e) { console.error(e); }
};

window.toggleBan = async (uid, isBanned) => {
    try {
        await updateDoc(doc(db, "users", uid), { banned: !isBanned });
        loadUsers();
    } catch (e) { console.error(e); }
};

window.removeUser = async (uid) => {
    if (confirm("Löschen?")) {
        try {
            await deleteDoc(doc(db, "users", uid));
            loadUsers();
        } catch (e) { console.error(e); }
    }
};

window.logout = async () => {
    await signOut(auth);
    window.location.href = "index.html";
};

// --- AUTH CHECK ALS LETZTES ---

onAuthStateChanged(auth, async (user) => {
    if (!user) { 
        window.location.href = "index.html"; 
        return; 
    }
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists() || snap.data().role !== "Admin") {
            window.location.href = "dashboard.html";
        } else {
            // Jetzt ist loadUsers garantiert definiert
            loadUsers();
        }
    } catch (e) {
        console.error("Auth Check Fehler:", e);
    }
});
