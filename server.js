// ✅ server.js with Firebase Firestore + OneSignal Push Notifications

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ✅ OneSignal API keys from .env
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

// 🛠️ Endpoint to add a task (optional use)
app.post("/add-task", async (req, res) => {
  try {
    const { name, time, date, priority } = req.body;
    const task = { name, time, date, priority, alerted: false, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    await db.collection("tasks").add(task);
    res.status(200).send({ message: "✅ Task added." });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// 🔁 Scheduled check to find tasks due in the current minute
async function checkAndSendNotifications() {
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5); // HH:mm

  const snapshot = await db.collection("tasks")
    .where("alerted", "==", false)
    .where("date", "==", currentDate)
    .where("time", "==", currentTime)
    .get();

  const promises = snapshot.docs.map(async (doc) => {
    const task = doc.data();
    // ✅ Send push notification via OneSignal
    await axios.post("https://onesignal.com/api/v1/notifications", {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Subscribed Users"],
      headings: { en: "⏰ Reminder" },
      contents: { en: `Task Due: ${task.name}` },
      url: "https://brijvyas-7.github.io/Todo-List/",
    }, {
      headers: {
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    // ✅ Mark as alerted
    await db.collection("tasks").doc(doc.id).update({ alerted: true });
  });

  await Promise.all(promises);
  console.log(`Checked at ${currentTime}, sent ${promises.length} reminders.`);
}

// 🔁 Run every 60 seconds (or you can use cron on Render Scheduler)
setInterval(checkAndSendNotifications, 60000);

// 📡 Optional ping route to keep server warm
app.get("/", (req, res) => {
  res.send("✅ Todo Reminder Backend Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
