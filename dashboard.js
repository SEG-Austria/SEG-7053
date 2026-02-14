import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    limit, 
    onSnapshot,
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 1. MITGLIEDERLISTE (ECHTZEIT) ---
function loadMembers() {
    const tableBody = document.getElementById("memberList");
    if (!tableBody) return;

    onSnapshot(collection(db, "users"), (snapshot) => {
        tableBody.innerHTML = "";
        snapshot.forEach((doc) => {
            const data = doc.data();
            const row = `
                <tr>
                    <td>${data.username || "Unbekannt"}</td>
                    <td><span class="role-badge ${data.role ? data.role.split(' ')[0] : ''}">${data.role || "Arbeiter"}</span></td>
                    <td style="color: ${data.status === 'Anwesend' ? '#99cc00' : '#ff4444'}; font-weight: bold;">
                        ${data.status || "Keine Schicht"}
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    });
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

// --- 3. GESICHTSERKENNUNG ---
async function initFaceAI() {
    const status = document.getElementById('faceStatus');
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'; 

    try {
        if(status) status.innerText = "Lade Biometrie-Module...";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        if(status) status.innerText = "KI bereit. Kamera startet...";
        startVideo();
    } catch (e) {
        console.error("Face-API Fehler:", e);
        if(status) status.innerText = "Gesichtsscan-Modul konnte nicht geladen werden.";
    }
}

function startVideo() {
    const video = document.getElementById('video');
    if (!video) return;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => {
            video.srcObject = stream;
            recognizeFace();
        })
        .catch(err => {
            console.error("Kamera-Zugriff verweigert:", err);
            const status = document.getElementById('faceStatus');
            if(status) status.innerText = "Kamera-Zugriff blockiert (Safari-Einstellungen prüfen).";
        });
}

window.registerFace = async () => {
    const video = document.getElementById('video');
    const status = document.getElementById('faceStatus');
    
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detections) {
        const user = auth.currentUser;
        const faceArray = Array.from(detections.descriptor);
        await updateDoc(doc(db, "users", user.uid), { faceDescriptor: faceArray });
        alert("Gesichtsprofil erfolgreich gespeichert!");
        location.reload(); 
    } else {
        alert("Kein Gesicht erkannt. Bitte direkt in die Kamera schauen.");
    }
};

async function recognizeFace() {
    const video = document.getElementById('video');
    const status = document.getElementById('faceStatus');
    const user = auth.currentUser;

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const savedDescriptor = userSnap.data().faceDescriptor;

    if (!savedDescriptor) {
        if(status) status.innerText = "Kein Profil gefunden. Bitte Scannen.";
        document.getElementById('regBtn').style.display = "block";
        return;
    }

    const faceMatcher = new faceapi.FaceMatcher(new faceapi.LabeledFaceDescriptors(
        user.uid, [new Float32Array(savedDescriptor)]
    ), 0.6);

    setInterval(async () => {
        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detections) {
            const match = faceMatcher.findBestMatch(detections.descriptor);
            if (match.label !== 'unknown') {
                if(status) status.innerHTML = "<span style='color: #99cc00;'>✅ Identität bestätigt!</span>";
                
                // Status auf Anwesend setzen, falls nicht schon geschehen
                if (userSnap.data().status !== "Anwesend") {
                    await updateDoc(doc(db, "users", user.uid), { status: "Anwesend" });
                    await addDoc(collection(db, "logs"), {
                        targetUser: userSnap.data().username,
                        newStatus: "Anwesend (Face-ID)",
                        changedAt: serverTimestamp(),
                        changedBy: "System (Biometrie)"
                    });
                }
            } else {
                if(status) status.innerHTML = "<span style='color: #ff4444;'>❌ Unbekannt...</span>";
            }
        }
    }, 3000);
}

// --- 4. AUTH-CHECK & ADMIN-BUTTON ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        // Prüft, ob das Feld 'banned' auf true gesetzt ist
        if (userData && userData.banned === true) {
            alert("❌ ZUGRIFF VERWEIGERT: Dein Account ist gesperrt.");
            await signOut(auth);
            window.location.href = "index.html";
            return; 
        }

        // Falls nicht gesperrt -> Normaler Ladevorgang
        loadMembers();
        loadLogs();
        initFaceAI();
        
        if (userData.role === "Admin") {
            document.getElementById("adminPanelBtn").style.display = "block";
        }
    } else {
        window.location.href = "index.html"; // Schickt ihn zum Login zurück
            return; // Stoppt die weitere Ausführung
        }

        // 3. Wenn nicht gesperrt, lade das Dashboard normal
        loadMembers();
        loadLogs();
        initFaceAI();

        // Admin-Button anzeigen
        if (userData.role === "Admin") {
            const adminBtn = document.getElementById("adminPanelBtn");
            if (adminBtn) adminBtn.style.display = "block";
        }
    } else {
        // Falls nicht eingeloggt, zum Login
        if (!window.location.pathname.includes("index.html")) {
            window.location.href = "index.html";
        }
    }
});

window.logout = () => signOut(auth).then(() => window.location.href = "index.html");
