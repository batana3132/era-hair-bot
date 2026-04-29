require("dotenv").config();
const express = require("express");
const https = require("https");
const { chat, isOrderIntent, isComplaintIntent } = require("./chatbot");
const { sendOrderNotification, sendComplaintAlert } = require("./telegram");

const app = express();
app.use(express.json());

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

// Webhook verification (Facebook sends a GET to confirm the endpoint)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
    console.log("✅ Facebook webhook баталгаажлаа");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Receive messages from Facebook Messenger
app.post("/webhook", async (req, res) => {
  // Respond immediately so Facebook doesn't retry
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== "page") return;

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      // Skip echo messages sent by the page itself
      if (!event.message || event.message.is_echo) continue;

      const senderId = event.sender.id;
      const messageText = event.message.text;
      if (!messageText) continue;

      try {
        const userProfile = await getFBUserProfile(senderId);
        const userName = userProfile
          ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()
          : null;

        // Notify admin on Telegram for orders and complaints
        if (isOrderIntent(messageText)) {
          await sendOrderNotification({ userId: senderId, userName, message: messageText });
        } else if (isComplaintIntent(messageText)) {
          await sendComplaintAlert({ userId: senderId, userName, message: messageText });
        }

        const reply = await chat(senderId, messageText);
        await sendFBMessage(senderId, reply);
      } catch (err) {
        console.error(`[${senderId}] Алдаа:`, err.message);
        await sendFBMessage(
          senderId,
          "Уучлаарай, техникийн алдаа гарлаа. Түр хүлээгээд дахин туршина уу. 🙏"
        );
      }
    }
  }
});

function getFBUserProfile(userId) {
  return new Promise((resolve) => {
    const options = {
      hostname: "graph.facebook.com",
      path: `/v18.0/${userId}?fields=first_name,last_name&access_token=${FB_PAGE_ACCESS_TOKEN}`,
      method: "GET",
    };

    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

function sendFBMessage(recipientId, text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    });

    const options = {
      hostname: "graph.facebook.com",
      path: `/v18.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          console.error("FB мессеж алдаа:", data);
        }
        resolve();
      });
    });

    req.on("error", (err) => {
      console.error("FB HTTP алдаа:", err.message);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

app.listen(PORT, () => {
  console.log(`✅ Era Hair Bot сервер ажиллаж байна: http://localhost:${PORT}`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook`);
});
