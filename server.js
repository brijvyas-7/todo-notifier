// ✅ STEP 1: Required packages
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const cron = require("node-cron");
const moment = require("moment-timezone");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ STEP 2: Firebase Admin SDK config via .env
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

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ✅ STEP 3: Save Task Endpoint
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
    console.log("✅ Task saved to Firestore:", { name, time, date, playerId });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Save task failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ STEP 4: Cron Job Every Minute to Send Due Reminders
cron.schedule("* * * * *", async () => {
  console.log(`🔁 Cron running at: ${new Date().toISOString()}`);
  try {
    const now = moment().tz("Asia/Kolkata");
    const snapshot = await db.collection("tasks").where("alerted", "==", false).get();

    console.log(`📋 Found ${snapshot.size} unalerted tasks`);
    snapshot.forEach(async doc => {
      const task = doc.data();
      const taskTime = moment.tz(`${task.date} ${task.time}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata");

      console.log("🔍 Task:", task.name);
      console.log("⏰ Task Time:", taskTime.format());

      // Check if it's within 1 minute of the current time
      if (taskTime.isSameOrBefore(now) && now.diff(taskTime, 'minutes') < 2) {
        console.log("🚀 Sending push to:", task.playerId);

        // 🔐 Log partially masked key for debugging
        console.log("🔐 Using API Key:", (process.env.ONESIGNAL_API_KEY || "").substring(0, 10) + "...");

        const pushResponse = await fetch("https://onesignal.com/api/v1/notifications", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
  },
  body: JSON.stringify({
    app_id: process.env.ONESIGNAL_APP_ID,
    include_player_ids: [task.playerId],
    headings: { en: "⏰ Reminder : Hey buddy!" },
    contents: { en: `Your task '${task.name}' is due now!` },
    chrome_web_origin: "",       // ✅ Prevent "from Todo"
    url: "",                     // ✅ Prevent default link
  }),
});

        const result = await pushResponse.json();
        console.log("📤 Push result:", result);

        await doc.ref.update({ alerted: true });
      } else {
        console.log(`⏱️ Task not yet due or already passed: ${task.name}`);
      }
    });
  } catch (err) {
    console.error("❌ Cron failed:", err.message);
  }
});

// ✅ Simple Ping Test Route
app.get("/ping", (_, res) => res.send("✅ Reminder server running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
