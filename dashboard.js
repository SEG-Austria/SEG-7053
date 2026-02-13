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

// 🚪 Logout
window.logout = async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (e) {
        console.error("Logout Fehler", e);
    }
};
