// STEP 1: Install these on your Render backend if not done yet
// npm install express cors dotenv firebase-admin node-cron

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const cron = require("node-cron");
require("dotenv").config();


const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Setup
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Save task to Firestore
app.post("/save-task", async (req, res) => {
  try {
    const { name, time, date, priority, playerId } = req.body;
    await db.collection("tasks").add({
      name,
      time,
      date,
      priority,
      playerId,
      alerted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check & send notifications (runs every minute)
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const snapshot = await db.collection("tasks").where("alerted", "==", false).get();

  snapshot.forEach(async doc => {
    const task = doc.data();
    const taskTime = new Date(`${task.date}T${task.time}`);

    if (taskTime <= now && now - taskTime <= 60000) {
      // Call OneSignal API
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`
        },
        body: JSON.stringify({
          app_id: process.env.ONESIGNAL_APP_ID,
          include_player_ids: [task.playerId],
          headings: { en: "⏰ Reminder" },
          contents: { en: `Your task '${task.name}' is due now!` },
        })
      });

      await doc.ref.update({ alerted: true });
    }
  });
});

app.get("/ping", (_, res) => res.send("✅ Reminder server running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
