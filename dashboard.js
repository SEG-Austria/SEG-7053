import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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

// --- GLOBAL VARIABLES & STATE ---
let memberUnsubscribe = null;
let logUnsubscribe = null;

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

// 📋 Liste laden
function loadMembers() {
    const list = document.getElementById("memberList");
    try {
        if (memberUnsubscribe) memberUnsubscribe();
        memberUnsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
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

    if (logUnsubscribe) logUnsubscribe();
    const q = query(collection(db, "logs"), orderBy("changedAt", "desc"), limit(10));
    logUnsubscribe = onSnapshot(q, (snapshot) => { // Keep onSnapshot for logs
        logBox.innerHTML = "";
        snapshot.forEach(d => {
            const l = d.data();
            const zeit = (l.changedAt && typeof l.changedAt.toDate === 'function') ? l.changedAt.toDate().toLocaleString('de-DE') : "Synchronisiere...";
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

// --- 3. NEWS LADEN ---
function loadDashboardNews() {
    const newsBox = document.getElementById("dashboardNews");
    const newsContent = document.getElementById("newsContent");
    if (!newsBox || !newsContent) return;

    onSnapshot(doc(db, "system", "news"), (snap) => {
        const text = snap.exists() ? snap.data().text : "";
        newsContent.innerText = text;
        newsBox.style.display = text.trim() ? "block" : "none";
    });
}

// --- 4. NOTFALL-DURCHSAGE LADEN ---
function loadEmergencyAlert() {
    const alertBox = document.getElementById("emergencyAlert");
    const alertContent = document.getElementById("emergencyContent");
    if (!alertBox || !alertContent) return;

    onSnapshot(doc(db, "system", "emergency"), (snap) => {
        const text = snap.exists() ? snap.data().text : "";
        alertContent.innerText = text;
        alertBox.style.display = text.trim() ? "block" : "none";
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
            loadDashboardNews();
            loadEmergencyAlert();

            // 4. Admin-Check für den Button
            const username = (userData.username || "").trim().toLowerCase();
            const isAdmin = userData.role === "Admin" || username === "websiteadministration";

            if (isAdmin) {
                const adminBtn = document.getElementById("adminPanelBtn");
                if (adminBtn) {
                    adminBtn.style.display = "block";
                }
            }

            // --- EMERGENCY MAINTENANCE WATCHER ---
            const isSuperAdmin = username === "websiteadministration";
            onSnapshot(doc(db, "system", "maintenance"), async (snap) => {
                if (snap.exists() && snap.data().enabled === true && !isSuperAdmin) {
                    alert("SYSTEM-SPERRE: Das System wurde für Wartungsarbeiten gesperrt.");
                    await signOut(auth);
                    window.location.href = "index.html";
                }
            });
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

window.logout = () => signOut(auth).then(() => {
    if (memberUnsubscribe) memberUnsubscribe();
    if (logUnsubscribe) logUnsubscribe();
    window.location.href = "index.html";
});
