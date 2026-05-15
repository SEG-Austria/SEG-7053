import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    query, 
    orderBy, 
    limit, 
    onSnapshot
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔐 Prüfen ob angemeldet
onAuthStateChanged(auth, async (user) => {
    const msgEl = document.getElementById("welcomeMsg");
    
    if (!user) {
        console.log("Kein User eingeloggt, leite weiter...");
        window.location.href = "index.html";
        return;
    }

    try {
        console.log("User eingeloggt:", user.uid);
        const snap = await getDoc(doc(db, "users", user.uid));
        
        if (snap.exists()) {
            const userData = snap.data();
            msgEl.innerText = `Willkommen, ${userData.username || "Mitglied"}`;
            
            // Admin-Link anzeigen falls berechtigt
            const adminBtn = document.getElementById("adminLink");
            if (adminBtn && userData.role === "Admin") {
                adminBtn.style.display = "block";
            }
            
            loadMembers();
        } else {
            msgEl.innerText = "Fehler: User-Profil nicht in Datenbank gefunden.";
            console.error("Kein Firestore-Dokument für UID:", user.uid);
        }
    } catch (error) {
        msgEl.innerText = "Fehler beim Laden des Profils.";
        console.error("Dashboard Error:", error);
    }
});

// 📋 Liste laden
async function loadMembers() {
    const list = document.getElementById("memberList");
    try {
        const snap = await getDocs(collection(db, "users"));
        list.innerHTML = "";
        
        // In dashboard.js innerhalb von loadMembers():
snap.forEach(d => {
    const u = d.data();
    if (u.banned) return;

    // Status-Farbe bestimmen
    let statusColor = "#99cc00"; // Grün
    if (u.status === "Abwesend (Entschuldigt)") statusColor = "#ffbb33"; // Gelb
    if (u.status === "Abwesend (Unentschuldigt)") statusColor = "#ff4444"; // Rot

    const row = `
        <tr>
            <td>${u.username}</td>
            <td><span class="role-badge ${u.role ? u.role.split(' ')[0] : ''}">${u.role}</span></td>
            <td><span style="color: ${statusColor}; font-weight: bold;">● ${u.status || "Anwesend"}</span></td>
        </tr>
    `;
    list.innerHTML += row;
});
    } catch (e) {
        console.error("Fehler beim Laden der Mitglieder:", e);
        list.innerHTML = "<tr><td colspan='2'>Fehler beim Laden der Liste.</td></tr>";
    }
}

// --- 2. LOGS LADEN (LETZTE 10) ---
function loadLogs() {
    const logBox = document.getElementById("logList");
    if (!logBox) return;

    const q = query(collection(db, "logs"), orderBy("changedAt", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        logBox.innerHTML = "";
        snapshot.forEach(d => {
            const l = d.data();
            const zeit = l.changedAt ? l.changedAt.toDate().toLocaleString('de-DE') : "Gerade eben";
            logBox.innerHTML += `
                <div class="log-item" style="border-bottom: 1px solid #333; padding: 5px 0;">
                    <span style="color: #888; font-size: 0.75em;">[${zeit}]</span><br>
                    <strong style="color: var(--primary-gold);">${l.targetUser}</strong> 
                    <span style="color: #eee;">→ ${l.newStatus}</span>
                </div>
            `;
        });
    });
}

// --- 4. AUTH-CHECK & ADMIN-BUTTON ---
// --- 4. AUTH-CHECK & INITIALISIERUNG ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // 1. Hol die Daten des Nutzers aus Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (!userDoc.exists()) {
                console.error("Nutzerdaten nicht gefunden!");
                return;
            }

            const userData = userDoc.data();

            // 2. CHECK: Ist der Nutzer gesperrt? (Feld: banned: true)
            if (userData.banned === true) {
                alert("❌ ZUGRIFF VERWEIGERT: Dein Account ist gesperrt.");
                await signOut(auth);
                window.location.href = "index.html";
                return; 
            }

            // 3. Wenn nicht gesperrt -> Dashboard laden
            loadMembers();
            loadLogs();

            // 4. Admin-Check für den Button
            if (userData.role === "Admin") {
                const adminBtn = document.getElementById("adminPanelBtn");
                if (adminBtn) {
                    adminBtn.style.display = "block";
                    adminBtn.onclick = () => { window.location.href = "admin.html"; };
                }
            }
        } catch (error) {
            console.error("Fehler im Auth-Check:", error);
        }
    } else {
        // Falls gar nicht eingeloggt -> zurück zum Login
        if (!window.location.pathname.includes("index.html")) {
            window.location.href = "index.html";
        }
    }
}); // <-- Diese Klammern fehlten wahrscheinlich oder waren falsch gesetzt

window.logout = () => signOut(auth).then(() => window.location.href = "index.html");
