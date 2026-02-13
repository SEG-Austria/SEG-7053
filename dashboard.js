import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// 🔐 Authentifizierung prüfen
onAuthStateChanged(auth, async (user) => {
    const msgEl = document.getElementById("welcomeMsg");
    
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        
        if (snap.exists()) {
            const userData = snap.data();
            msgEl.innerText = `Glück auf, ${userData.username}!`;
            
            // Admin-Link anzeigen falls berechtigt
            const adminDiv = document.getElementById("adminLink");
            if (adminDiv && userData.role === "Admin") {
                adminDiv.style.display = "block";
            }
            
            loadMembers();
        } else {
            msgEl.innerText = "Profil nicht gefunden.";
        }
    } catch (error) {
        console.error("Dashboard Fehler:", error);
    }
});

// 📋 Mitgliederliste mit Anwesenheit laden
async function loadMembers() {
    const list = document.getElementById("memberList");
    if (!list) return;

    try {
        const snap = await getDocs(collection(db, "users"));
        list.innerHTML = "";
        
        snap.forEach(d => {
            const u = d.data();
            if (u.banned) return; // Gesperrte ausblenden

            // 1. Rollen-Klasse säubern (für CSS)
            const safeClass = u.role ? u.role.split(' ')[0] : "Rekrut";

            // 2. Status-Farbe bestimmen
            // 2. Status-Farbe bestimmen und Text aus der Datenbank übernehmen
let statusText = u.status || "Anwesend"; // Fallback, falls das Feld leer ist
let statusColor = "#99cc00"; // Standard: Grün

if (statusText.includes("Entschuldigt")) {
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
        list.innerHTML = "<tr><td colspan='3'>Fehler beim Laden der Liste.</td></tr>";
    }
}

// 🚪 Logout
window.logout = async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (e) {
        console.error("Logout fehlgeschlagen", e);
    }
};
