const admin = require('firebase-admin');

// Die Zugangsdaten kommen sicher über GitHub Secrets (siehe Schritt 2)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function resetStatus() {
  console.log("Starte täglichen Reset um 00:00 Uhr...");
  
  try {
    const usersSnap = await db.collection('users').get();
    const batch = db.batch();

    usersSnap.forEach(doc => {
      batch.update(doc.ref, { status: "Keine Schicht" });
    });

    await batch.commit();
    console.log("Erfolg: Alle User auf 'Keine Schicht' gesetzt.");

    // Optionaler Log-Eintrag
    await db.collection('logs').add({
      targetUser: "SYSTEM",
      newStatus: "Automatischer Mitternachts-Reset",
      changedAt: admin.firestore.FieldValue.serverTimestamp(),
      changedBy: "GitHub Action (CronJob)"
    });

  } catch (error) {
    console.error("Fehler beim Reset:", error);
    process.exit(1);
  }
}

resetStatus();
