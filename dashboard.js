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
// 📋 Liste laden
async function loadMembers() {
    const list = document.getElementById("memberList");
    try {
        // Use onSnapshot for real-time updates
        onSnapshot(collection(db, "users"), (snapshot) => {
            list.innerHTML = "";
        
            snapshot.forEach(d => {
                const u = d.data();
                if (u.banned) return;

                const statusNormalized = (u.status || "Anwesend").toLowerCase();

                // Status-Farbe bestimmen
                let statusColor = "var(--success)"; // Grün
                if (statusNormalized.includes("entschuldigt") && !statusNormalized.includes("unentschuldigt")) statusColor = "var(--warning)"; 
                if (statusNormalized.includes("unentschuldigt")) statusColor = "var(--danger)";
                if (statusNormalized === "keine schicht") statusColor = "#888"; // Grey for no shift

                const row = `
                    <tr>
                        <td>${u.username}</td>
                        <td><span class="role-badge ${u.role ? u.role.split(' ')[0] : ''}">${u.role}</span></td>
                        <td><span class="status-dot" style="background-color: ${statusColor};"></span> ${u.status || "Anwesend"}</td>
                    </tr>
                `;
                list.innerHTML += row;
            });
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
    onSnapshot(q, (snapshot) => { // Keep onSnapshot for logs
        logBox.innerHTML = "";
        snapshot.forEach(d => {
            const l = d.data();
            const zeit = l.changedAt ? l.changedAt.toDate().toLocaleString('de-DE') : "Gerade eben";
            logBox.innerHTML += `
                <div class="log-item">
                    <span style="color: #888; font-size: 0.75em;">[${zeit}]</span><br>
                    <strong style="color: var(--primary-gold);">${l.targetUser}</strong> 
                    <span style="color: #eee;">→ ${l.newStatus}</span>
                </div>
            `;
        });
    });
}

// --- 4. AUTH-CHECK & ADMIN-BUTTON ---
// Consolidated Auth Check & Initialization
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // 1. Hol die Daten des Nutzers aus Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (!userDoc.exists()) {
                console.error("Nutzerdaten nicht gefunden!");
                // If user exists in auth but not in Firestore, log them out
                alert("Dein Profil konnte nicht geladen werden. Bitte melde dich erneut an.");
                await signOut(auth);
                window.location.href = "index.html";
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

            // Display welcome message
            const msgEl = document.getElementById("welcomeMsg");
            if (msgEl) msgEl.innerText = `Willkommen, ${userData.username || "Mitglied"}!`;

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
});

window.logout = () => signOut(auth).then(() => window.location.href = "index.html");
