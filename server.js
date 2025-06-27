// ✅ Backend: server.js (updated to use .env and Firebase Admin SDK)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Initialize Firebase Admin with environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
  })
});

const db = admin.firestore();

app.use(cors());
app.use(express.json());

// ✅ Route to store task
app.post('/add-task', async (req, res) => {
  const task = req.body;
  try {
    const docRef = await db.collection('tasks').add(task);
    res.status(200).json({ id: docRef.id, message: 'Task added' });
  } catch (err) {
    console.error('Error adding task:', err);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// ✅ Reminder Trigger (simulate scheduler like cron job)
app.post('/send-notification', async (req, res) => {
  const { title, message } = req.body;

  try {
    // Use OneSignal API to send notification
    const onesignalRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        included_segments: ['Subscribed Users'],
        headings: { en: title },
        contents: { en: message },
      })
    });

    const json = await onesignalRes.json();
    res.status(200).json({ success: true, json });
  } catch (err) {
    console.error('Notification error:', err);
    res.status(500).json({ error: 'Notification failed' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
