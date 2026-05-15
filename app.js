import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// --- AUTOMATISCHE WEITERLEITUNG ---
// Wenn der User schon eingeloggt ist, schick ihn direkt zum Dashboard
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.includes("index.html")) {
        window.location.href = "dashboard.html";
    }
});

// --- LOGIN FUNKTION ---
window.login = async () => {
    const userField = document.getElementById("loginEmail");
    const passField = document.getElementById("loginPassword");
    const errorMsg = document.getElementById("errorMsg");

    if (!userField || !passField) return;

    const username = userField.value.trim();
    const password = passField.value;

    if (!username || !password) {
        errorMsg.innerText = "Bitte Name und Passwort eingeben!";
        return;
    }

    // Erstellt die interne E-Mail (z.B. max@seg.local)
    const email = username.includes("@") ? username : username.toLowerCase() + "@seg.local";

   try {
    errorMsg.style.color = "var(--primary-gold)";
    errorMsg.innerText = "Verifiziere Identität...";
    
    // 1. Login durchführen
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Rolle aus Firestore abrufen
    const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const db = getFirestore(app);
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists() && userDoc.data().role === "Admin") {
        // Admin -> Admin-Panel
        window.location.href = "admin.html";
    } else {
        // Normaler User -> Dashboard
        window.location.href = "dashboard.html";
    }
    } catch (error) {
        console.error("Login Fehler:", error.code);
        errorMsg.style.color = "var(--danger)";
        
        // Nutzerfreundliche Fehlermeldungen
        switch (error.code) {
            case "auth/invalid-credential":
                errorMsg.innerText = "Name oder Passwort falsch!";
                break;
            case "auth/user-not-found":
                errorMsg.innerText = "Benutzer nicht gefunden!";
                break;
            case "auth/wrong-password":
                errorMsg.innerText = "Passwort ist nicht korrekt!";
                break;
            default:
                errorMsg.innerText = "Login fehlgeschlagen. Versuche es erneut.";
        }
    }
};

// Enter-Taste zum Einloggen ermöglichen
document.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        window.login();
    }
});
