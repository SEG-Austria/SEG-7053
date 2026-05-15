import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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
    writeBatch,
    getDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc,
    addDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCxwD04ZcxDjKkzCjIGXtGOJsewkAdNg50",
    authDomain: "seg-austria.firebaseapp.com",
    projectId: "seg-austria",
    storageBucket: "seg-austria.firebasestorage.app",
    messagingSenderId: "101261189931",
    appId: "1:101261189931:web:4f6b5bd9008f5f64bd1b6e"
};

// Initialisierung
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- BETA PASSWORD GATE ---
const isBeta = window.location.pathname.includes("/beta");
if (isBeta && localStorage.getItem("seg_beta_authorized") !== "true") {
    const betaCode = "beta2026"; 
    const entry = prompt("Bitte Beta-Zugangsschlüssel eingeben:");
    if (entry === betaCode) {
        localStorage.setItem("seg_beta_authorized", "true");
    } else {
        alert("Zugriff verweigert.");
        window.location.href = window.location.origin + window.location.pathname.split("/beta")[0] + "/";
    }
}

// Zeige Beta-Badge, wenn auf Beta-Pfad
if (isBeta) {
    const betaBadge = document.getElementById("betaBadge");
    if (betaBadge) betaBadge.style.display = "inline-block";
}

// Zweit-App für User-Erstellung (verhindert Logout des Admins)
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

// Konfigurationen
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

// --- KERNFUNKTIONEN ---
async function checkDailyReset() {
    const today = new Date().toLocaleDateString('de-DE');
    const resetRef = doc(db, "system", "lastReset");

    try {
        const resetSnap = await getDoc(resetRef);
        
        // Wenn das Datum in der Datenbank nicht von heute ist -> RESET
        if (!resetSnap.exists() || resetSnap.data().date !== today) {
            console.log("Neuer Tag erkannt! Setze alle Status auf 'Keine Schicht'...");
            
            const usersSnap = await getDocs(collection(db, "users"));
            const batch = writeBatch(db); // Fix: v10 syntax

            usersSnap.forEach(uDoc => {
                batch.update(uDoc.ref, { status: "Keine Schicht" });
            });

            await batch.commit(); // Commit all updates at once

            // Das Reset-Datum in der Datenbank aktualisieren
            await setDoc(resetRef, { date: today });

            // Optional: Einen Log-Eintrag erstellen
            await addDoc(collection(db, "logs"), {
                targetUser: "SYSTEM",
                newStatus: "Täglicher Reset (Alle auf Keine Schicht)",
                changedAt: serverTimestamp(),
                changedBy: "Automatisches System"
            });

            console.log("Täglicher Reset abgeschlossen.");
        }
    } catch (e) {
        console.error("Fehler beim Daily Reset:", e);
    }
}
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
                    <button onclick="window.removeUser('${d.id}')" style="color:red; margin-left:10px; background:none; border:1px solid red; cursor:pointer;">X</button>
                </td>
            `;
            userList.appendChild(row);
        });
    } catch (e) {
        console.error("Fehler beim Laden der User:", e);
    }
}

// --- NEWS FUNKTIONEN ---
async function loadCurrentNews() {
    const newsInput = document.getElementById("newsInput");
    if (!newsInput) return;
    const snap = await getDoc(doc(db, "system", "news"));
    if (snap.exists()) newsInput.value = snap.data().text || "";
}

window.updateNews = async () => {
    const newsText = document.getElementById("newsInput").value;
    try {
        await setDoc(doc(db, "system", "news"), { 
            text: newsText, 
            updatedAt: serverTimestamp() 
        });
        alert("News erfolgreich aktualisiert!");
    } catch (e) { alert("Fehler: " + e.message); }
};

// --- WINDOW FUNKTIONEN (GLOBALE EVENTS) ---

window.createUser = async () => {
    const uEl = document.getElementById("newUsername");
    const pEl = document.getElementById("newPassword");
    const rEl = document.getElementById("newRole");
    if (!uEl.value || !pEl.value) return alert("Username oder Passwort fehlt!");

    try {
        const email = uEl.value.toLowerCase().trim() + "@seg.local";
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pEl.value);
        
        await setDoc(doc(db, "users", cred.user.uid), {
            username: uEl.value,
            role: rEl.value,
            status: "Anwesend",
            banned: false
        });

        alert(`User ${uEl.value} wurde erstellt!`);
        uEl.value = ""; pEl.value = "";
        loadUsers();
    } catch (e) { alert("Fehler: " + e.message); }
};

window.setRole = async (uid, newRole) => {
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        const username = userSnap.exists() ? userSnap.data().username : "Unbekannt";

        await updateDoc(doc(db, "users", uid), { role: newRole });

        // LOGGING
        await addDoc(collection(db, "logs"), {
            targetUser: username,
            newStatus: `Beförderung/Rang: ${newRole}`,
            changedAt: serverTimestamp(),
            changedBy: auth.currentUser.email
        });
        console.log("Rolle geändert & Log erstellt.");
    } catch (e) { console.error(e); }
};

window.setStatus = async (uid, newStatus) => {
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        const username = userSnap.exists() ? userSnap.data().username : "Unbekannt";

        await updateDoc(doc(db, "users", uid), { status: newStatus });

        // LOGGING
        await addDoc(collection(db, "logs"), {
            targetUser: username,
            newStatus: newStatus,
            changedAt: serverTimestamp(),
            changedBy: auth.currentUser.email
        });
        console.log("Status geändert & Log erstellt.");
    } catch (e) { console.error(e); }
};

window.toggleBan = async (uid, isBanned) => {
    try {
        await updateDoc(doc(db, "users", uid), { banned: !isBanned });
        loadUsers();
    } catch (e) { console.error(e); }
};

window.removeUser = async (uid) => {
    if (confirm("Möchtest du diesen Account wirklich löschen?")) {
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

// --- AUTH CHECK & START ---

onAuthStateChanged(auth, async (user) => {
    try {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists() || snap.data().role !== "Admin") {
            window.location.href = "dashboard.html";
        } else {
            // Only call checkDailyReset and loadUsers once after admin check
            await checkDailyReset();
            loadUsers();
            loadCurrentNews();
        }
    } catch (e) {
        console.error("Auth-Error:", e);
        window.location.href = "index.html"; // Redirect on error
    }
});
