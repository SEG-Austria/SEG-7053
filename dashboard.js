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

// --- 1. MITGLIEDERLISTE LADEN ---
async function loadMembers() {
    const tableBody = document.getElementById("memberList");
    if (!tableBody) return;

    const querySnapshot = await getDocs(collection(db, "users"));
    tableBody.innerHTML = "";

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const row = `
            <tr>
                <td>${data.username}</td>
                <td><span class="role-badge ${data.role ? data.role.split(' ')[0] : ''}">${data.role || "Arbeiter"}</span></td>
                <td style="color: ${data.status === 'Anwesend' ? '#99cc00' : '#ff4444'}">${data.status || "Unbekannt"}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// --- 2. LOGS LADEN (ECHTZEIT) ---
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
                <div class="log-item">
                    <span style="color: #888; font-size: 0.8em;">[${zeit}]</span><br>
                    <strong style="color: var(--primary-gold);">${l.targetUser}</strong> 
                    <span style="color: #eee;">→ ${l.newStatus}</span>
                </div>
            `;
        });
    });
}

// --- 3. GESICHTSERKENNUNG (WEG 1) ---
async function initFaceAI() {
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'; 
    const status = document.getElementById('faceStatus');

    try {
        if(status) status.innerText = "Lade KI-Hirn...";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        if(status) status.innerText = "KI bereit. Starte Kamera...";
        startVideo();
    } catch (e) {
        console.error("KI-Fehler:", e);
        if(status) status.innerText = "KI konnte nicht geladen werden.";
    }
}

function startVideo() {
    const video = document.getElementById('video');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => {
            video.srcObject = stream;
            recognizeFace();
        })
        .catch(err => console.error("Kamera-Fehler:", err));
}

window.registerFace = async () => {
    const video = document.getElementById('video');
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detections) {
        const user = auth.currentUser;
        const faceArray = Array.from(detections.descriptor);
        await updateDoc(doc(db, "users", user.uid), { faceDescriptor: faceArray });
        alert("Gesicht biometrisch gespeichert!");
        location.reload(); // Seite neu laden um Abgleich zu starten
    } else {
        alert("Kein Gesicht erkannt. Bitte ins Licht rücken.");
    }
};

async function recognizeFace() {
    const video = document.getElementById('video');
    const status = document.getElementById('faceStatus');
    
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const savedDescriptor = userSnap.data().faceDescriptor;

    if (!savedDescriptor) {
        status.innerText = "Kein Gesicht hinterlegt. Bitte registrieren.";
        document.getElementById('regBtn').style.display = "block";
        return;
    }

    const faceMatcher = new faceapi.FaceMatcher(new faceapi.LabeledFaceDescriptors(
        auth.currentUser.uid, [new Float32Array(savedDescriptor)]
    ), 0.6);

    setInterval(async () => {
        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detections) {
            const match = faceMatcher.findBestMatch(detections.descriptor);
            if (match.label !== 'unknown') {
                status.innerHTML = "<span style='color: #99cc00;'>✅ Identität bestätigt!</span>";
                await updateDoc(doc(db, "users", auth.currentUser.uid), { status: "Anwesend" });
            } else {
                status.innerHTML = "<span style='color: #ff4444;'>❌ Unbekannt (Scan läuft...)</span>";
            }
        }
    }, 3000);
}

// --- 4. AUTH-CHECK & INITIALISIERUNG ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadMembers();
        loadLogs();
        initFaceAI();
    } else {
        window.location.href = "index.html";
    }
});

window.logout = () => signOut(auth);
