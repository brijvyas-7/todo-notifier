require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

app.post("/send-notification", async (req, res) => {
  const { title = "🔔 Reminder!", message = "You have a task due!" } = req.body;

  try {
    const response = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["Subscribed Users"],
        headings: { en: title },
        contents: { en: message },
        url: "https://brijvyas-7.github.io/Todo-List/",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${REST_API_KEY}`,
        },
      }
    );

    res.status(200).json({ success: true, response: response.data });
  } catch (error) {
    console.error("❌ Error sending notification:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ OneSignal Notification Server is Running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
