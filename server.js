const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const cron = require("node-cron");
const app = express();

const ONE_SIGNAL_APP_ID = "db9451af-136d-4ce4-bc80-b39aa7589d4c"; // Replace this
const ONE_SIGNAL_API_KEY = "os_v2_app_3okfdlytnvgojpeawonkowe5jt5t7k6dfppewje2xmzcoau3n34o4chwfbj7gnpmg7x2m26zlgcqwk3ys35tf6gwia3im4cymhbimzq"; // Replace this

const PORT = process.env.PORT || 3000;

// Read tasks
function getTasks() {
  try {
    return JSON.parse(fs.readFileSync("tasks.json", "utf-8"));
  } catch {
    return [];
  }
}

// Save tasks
function saveTasks(tasks) {
  fs.writeFileSync("tasks.json", JSON.stringify(tasks, null, 2));
}

// Send push
async function sendPushNotification(taskName) {
  try {
    await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: ONE_SIGNAL_APP_ID,
        included_segments: ["All"],
        headings: { en: "⏰ Task Reminder" },
        contents: { en: `${taskName} is due now!` }
      },
      {
        headers: {
          Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Notification sent for: ${taskName}`);
  } catch (err) {
    console.error("❌ Failed to send:", err.message);
  }
}

// Check every 1 min
cron.schedule("* * * * *", () => {
  const now = new Date();
  const tasks = getTasks();
  let updated = false;

  tasks.forEach(task => {
    if (!task.alerted && task.date && task.time) {
      const taskTime = new Date(`${task.date}T${task.time}`);
      if (Math.abs(now - taskTime) < 60000) {
        sendPushNotification(task.name);
        task.alerted = true;
        updated = true;
      }
    }
  });

  if (updated) saveTasks(tasks);
});

app.get("/", (_, res) => res.send("✅ Reminder server running"));

app.listen(PORT, () => {
  console.log(`🚀 http://localhost:${PORT}`);
});
