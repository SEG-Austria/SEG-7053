import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// ... (nach dem erfolgreichen Laden der Mitgliederliste in dashboard.js) ...

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        const snap = await getDoc(doc(db, "users", user.uid));
        const userData = snap.data();
        
        document.getElementById("welcomeMsg").innerText = `Willkommen, ${userData.username}`;
        
        // Zeige Admin-Link nur wenn Rolle Admin ist
        if (userData.role === "Admin") {
            document.getElementById("adminLink").style.display = "block";
        }
        
        loadMembers();
    }
});

// 📋 Liste laden
async function loadMembers() {
    const list = document.getElementById("memberList");
    try {
        const snap = await getDocs(collection(db, "users"));
        list.innerHTML = "";
        
        snap.forEach(d => {
            const u = d.data();
            if (u.banned) return; // Gesperrte User nicht anzeigen

            const row = `
                <tr>
                    <td>${u.username}</td>
                    <td><span class="role-badge ${u.role}">${u.role}</span></td>
                </tr>
            `;
            list.innerHTML += row;
        });
    } catch (e) {
        list.innerHTML = "Fehler beim Laden.";
    }
}

// 🚪 Logout
window.logout = () => {
    signOut(auth).then(() => window.location.href = "index.html");
};
