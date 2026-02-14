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
let labeledDescriptor = null;

// 1. KI Modelle laden
async function initFaceAI() {
    const MODEL_URL = '/models'; // Pfad zu deinen Model-Dateien
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    startVideo();
}

function startVideo() {
    const video = document.getElementById('video');
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
            recognizeFace();
        });
}

// 2. Gesicht registrieren (Einmalig als Admin oder User)
window.registerFace = async () => {
    const video = document.getElementById('video');
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detections) {
        const user = auth.currentUser;
        // Speichere das Gesicht als normales Array in Firestore
        const faceArray = Array.from(detections.descriptor);
        await updateDoc(doc(db, "users", user.uid), { faceDescriptor: faceArray });
        alert("Gesicht biometrisch gespeichert!");
    } else {
        alert("Kein Gesicht erkannt. Bitte besser ins Licht rücken.");
    }
};

// 3. Gesicht abgleichen (Der Live-Check)
async function recognizeFace() {
    const video = document.getElementById('video');
    const status = document.getElementById('faceStatus');
    
    // Lade gespeicherten Descriptor vom User aus Firestore
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const savedDescriptor = userSnap.data().faceDescriptor;

    if (!savedDescriptor) {
        status.innerText = "Kein Gesicht hinterlegt. Bitte registrieren.";
        document.getElementById('regBtn').style.display = "block";
        return;
    }

    const faceMatcher = new faceapi.FaceMatcher(new faceapi.LabeledFaceDescriptors(
        auth.currentUser.uid, [new Float32Array(savedDescriptor)]
    ), 0.6); // 0.6 ist der Schwellenwert (kleiner = strenger)

    setInterval(async () => {
        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detections) {
            const match = faceMatcher.findBestMatch(detections.descriptor);
            if (match.label !== 'unknown') {
                status.innerHTML = "<span style='color: #99cc00;'>✅ Identität bestätigt!</span>";
                // Automatisch auf anwesend setzen
                updateDoc(doc(db, "users", auth.currentUser.uid), { status: "Anwesend" });
            } else {
                status.innerHTML = "<span style='color: #ff4444;'>❌ Unbekanntes Gesicht</span>";
            }
        }
    }, 2000); // Checkt alle 2 Sekunden
}

// Starten, wenn Auth bereit ist
onAuthStateChanged(auth, (user) => {
    if (user) initFaceAI();
});
async function startFaceRecognition() {
    // 1. KI-Modelle laden (müssen im Ordner /models liegen)
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

    // 2. Kamera starten
    const video = document.getElementById('video');
    navigator.mediaDevices.getUserMedia({ video: {} }, stream => video.srcObject = stream);

    // 3. Gesicht erkennen
    video.addEventListener('play', () => {
        setInterval(async () => {
            const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                console.log("Gesicht erkannt!");
                // Hier würde der Vergleich mit dem gespeicherten Descriptor stattfinden
                verifyUser(detections.descriptor);
            }
        }, 1000);
    });
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

       // In dashboard.js innerhalb von loadLogs()
logBox.innerHTML = "";
snap.forEach(d => {
    const l = d.data();
    const zeit = l.changedAt ? l.changedAt.toDate().toLocaleString('de-DE') : "Gerade eben";
    
    // Hier nutzen wir die neue Klasse .log-item
    logBox.innerHTML += `
        <div class="log-item">
            <span style="color: #888; font-size: 0.8em;">[${zeit}]</span><br>
            <strong style="color: var(--primary-gold);">${l.targetUser}</strong> 
            <span style="color: #eee;">→ ${l.newStatus}</span>
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
