const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function setAbwesend() {
  console.log("Starte Abend-Check um 18:00 Uhr...");
  try {
    const usersSnap = await db.collection('users').get();
    const batch = db.batch();

    usersSnap.forEach(doc => {
      // Nur Leute auf Abwesend setzen, die NICHT schon "Abwesend" oder "Gesperrt" sind
      const data = doc.data();
      if (data.status !== "Abwesend (unentschuldigt)" && data.role !== "Gesperrt") {
        batch.update(doc.ref, { status: "Abwesend (unentschuldigt)" });
      }
    });

    await batch.commit();
    await db.collection('logs').add({
      targetUser: "SYSTEM",
      newStatus: "Abwesend (unentschuldigt)",
      changedAt: admin.firestore.FieldValue.serverTimestamp(),
      changedBy: "Abend-Automatik (18:00)"
    });
    console.log("Alle User auf Abwesend gesetzt.");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
setAbwesend();
