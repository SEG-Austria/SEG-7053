import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, doc, getDoc, 
    query, orderBy, limit 
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

// 🔐 Auth Check
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
            
            if (userData.role === "Admin") {
                document.getElementById("adminLink").style.display = "block";
            }
            
            // Beides laden
            loadMembers();
            loadLogs();
        }
    } catch (e) {
        console.error(e);
    }
});

// 📋 Mitgliederliste
async function loadMembers() {
    const list = document.getElementById("memberList");
    try {
        const snap = await getDocs(collection(db, "users"));
        let members = [];
        snap.forEach(d => {
            if (!d.data().banned) members.push(d.data());
        });

        // Sortierung: Anwesend zuerst
        members.sort((a, b) => {
            const order = { "Anwesend": 1, "Keine Schicht": 2, "Abwesend (Entschuldigt)": 3, "Abwesend (Unentschuldigt)": 4 };
            return (order[a.status] || 5) - (order[b.status] || 5);
        });

        list.innerHTML = "";
        members.forEach(u => {
            let statusColor = "#99cc00";
            if (u.status === "Keine Schicht") statusColor = "#33b5e5";
            else if (u.status?.includes("Entschuldigt")) statusColor = "#ffbb33";
            else if (u.status?.includes("Unentschuldigt")) statusColor = "#ff4444";

            list.innerHTML += `
                <tr>
                    <td>${u.username}</td>
                    <td><span class="role-badge ${u.role?.split(' ')[0]}">${u.role}</span></td>
                    <td><span style="color: ${statusColor};">● ${u.status || "Anwesend"}</span></td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

// 📜 Log-System
async function loadLogs() {
    const logBox = document.getElementById("logList");
    try {
        // WICHTIG: query, orderBy und limit müssen importiert sein!
        const q = query(collection(db, "logs"), orderBy("changedAt", "desc"), limit(10));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            logBox.innerHTML = "Noch keine Aktivitäten aufgezeichnet.";
            return;
        }

        logBox.innerHTML = "";
        snap.forEach(d => {
            const l = d.data();
            const zeit = l.changedAt ? l.changedAt.toDate().toLocaleString('de-DE') : "Gerade eben";
            logBox.innerHTML += `
                <div style="border-bottom: 1px solid #333; padding: 5px 0; font-size: 0.9em;">
                    <span style="color: #c5a059;">[${zeit}]</span><br>
                    <strong>${l.targetUser}</strong> → <span style="color: #eee;">${l.newStatus}</span>
                </div>
            `;
        });
    } catch (e) {
        console.error("Log-Fehler:", e);
        // Falls der Index noch fehlt, zeigt Firebase einen Link in der Konsole an!
        logBox.innerHTML = "Fehler beim Laden. (Prüfe Browser-Konsole)";
    }
}

window.logout = () => signOut(auth).then(() => window.location.href = "index.html");
