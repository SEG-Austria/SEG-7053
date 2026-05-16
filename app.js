import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCxwD04ZcxDjKkzCjIGXtGOJsewkAdNg50",
    authDomain: "seg-austria.firebaseapp.com",
    projectId: "seg-austria",
    storageBucket: "seg-austria.firebasestorage.app",
    messagingSenderId: "101261189931",
    appId: "1:101261189931:web:4f6b5bd9008f5f64bd1b6e"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- OPTIONAL: BETA PASSWORD GATE ---
const isBeta = window.location.pathname.includes("/beta");
if (isBeta && localStorage.getItem("seg_beta_authorized") !== "true") {
    const betaCode = "beta2026"; // Set your desired password here
    const entry = prompt("Bitte Beta-Zugangsschlüssel eingeben:");
    if (entry === betaCode) {
        localStorage.setItem("seg_beta_authorized", "true");
    } else {
        alert("Zugriff verweigert: Falscher Schlüssel.");
        window.location.href = window.location.origin + window.location.pathname.split("/beta")[0] + "/";
    }
}

/**
 * Display the Beta-Badge if the current path is identified as a beta environment.
 */
if (isBeta) {
    const betaBadge = document.getElementById("betaBadge");
    if (betaBadge) betaBadge.style.display = "inline-block";
}

// --- NEWS LADEN (ÖFFENTLICH) ---
const newsRef = doc(db, "system", "news");
onSnapshot(newsRef, (snap) => {
    const newsEl = document.getElementById("newsContent");
    if (snap.exists() && newsEl) {
        newsEl.innerText = snap.data().text || "Keine aktuellen Neuigkeiten.";
    }
});

// --- AUTOMATISCHE WEITERLEITUNG ---
// Wenn der User schon eingeloggt ist, schick ihn direkt zum Dashboard
onAuthStateChanged(auth, async (user) => {
    const isLoginPage = window.location.pathname.endsWith("index.html") || window.location.pathname.endsWith("/");
    if (user && isLoginPage) {
        try {
            // Wir müssen auch hier prüfen, ob das System gesperrt ist, bevor wir weiterleiten
            const maintSnap = await getDoc(doc(db, "system", "maintenance"));
            const isMaint = maintSnap.exists() ? maintSnap.data().enabled : false;

            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            const isSuperAdmin = userData.username?.trim().toLowerCase() === "websiteadministration";

            if (isMaint && !isSuperAdmin) {
                await auth.signOut();
                const errorMsg = document.getElementById("errorMsg");
                if (errorMsg) errorMsg.innerText = "System gesperrt (Wartung).";
            } else {
                window.location.href = "dashboard.html";
            }
        } catch (e) {
            console.error("Fehler beim Auto-Login Check:", e);
        }
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
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    const isSuperAdmin = userData.username?.trim().toLowerCase() === "websiteadministration";
    const isAdmin = userData.role === "Admin" || userData.username?.trim().toLowerCase() === "websiteadministration";

    // --- EMERGENCY DISABLE CHECK ---
    const maintSnap = await getDoc(doc(db, "system", "maintenance"));
    const isMaint = maintSnap.exists() ? maintSnap.data().enabled : false;

    if (isMaint && !isSuperAdmin) {
        await auth.signOut();
        errorMsg.style.color = "var(--danger)";
        errorMsg.innerText = "SYSTEM-SPERRE: Wartungsarbeiten aktiv.";
        return;
    }

    if (isAdmin) {
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
