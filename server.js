require("dotenv").config();
const express = require("express");
const https = require("https");
const { chat } = require("./chatbot");
const { getSettings, saveSettings } = require("./settings");
const { sendTelegramMessage } = require("./telegram");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

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

        const reply = await chat(senderId, messageText, { userId: senderId, userName });
        if (reply) await sendFBMessage(senderId, reply);
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

// Telegram webhook — handles owner commands (/on, /off, etc.) and human takeover replies
app.post("/telegram-reply", (req, res) => {
  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (TELEGRAM_WEBHOOK_SECRET && secret !== TELEGRAM_WEBHOOK_SECRET) {
    return res.sendStatus(403);
  }

  res.sendStatus(200); // respond immediately so Telegram doesn't retry

  const message = req.body && req.body.message;
  if (!message || !message.text) return;

  // Only accept messages from the configured owner chat
  if (String(message.chat.id) !== String(TELEGRAM_CHAT_ID)) return;

  const text = message.text.trim();

  // Handle owner commands
  if (text.startsWith("/")) {
    handleOwnerCommand(text).catch((err) => {
      console.error("Command error:", err.message);
    });
    return;
  }

  // Human takeover — owner replies to a notification → forward to Facebook customer
  if (!message.reply_to_message) return;

  const originalText = message.reply_to_message.text || "";
  const fbIdMatch = originalText.match(/FBID: ([^\n]+)/);
  if (!fbIdMatch) return;

  const fbSenderId = fbIdMatch[1].trim();
  sendFBMessage(fbSenderId, text).catch((err) => {
    console.error("Human takeover send error:", err.message);
  });
});

async function handleOwnerCommand(text) {
  // Strip /command@botname format Telegram sometimes uses
  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/@\S+$/, "");
  const args = parts.slice(1);

  const settings = getSettings();
  let reply;

  switch (cmd) {
    case "/on":
      settings.enabled = true;
      saveSettings(settings);
      reply = "Bot: ON ✅";
      break;

    case "/off":
      settings.enabled = false;
      saveSettings(settings);
      reply = "Bot: OFF 🔴";
      break;

    case "/status":
      reply = settings.enabled ? "Bot: ON ✅" : "Bot: OFF 🔴";
      break;

    case "/instruction": {
      const instruction = args.join(" ");
      if (!instruction) {
        reply = "❌ Дүрэм текст оруулна уу.\nЖишээ: /instruction Хэрэглэгч хямдрал асуувал 10% хямдрал олго";
        break;
      }
      settings.instructions.push(instruction);
      saveSettings(settings);
      reply = `✅ Дүрэм нэмэгдлээ (#${settings.instructions.length}):\n"${instruction}"`;
      break;
    }

    case "/price": {
      const name = args[0];
      const price = args.slice(1).join(" ");
      if (!name || !price) {
        reply = "❌ Формат: /price [нэр] [үнэ]\nЖишээ: /price curling-wand 45000₮";
        break;
      }
      settings.products[name] = price;
      saveSettings(settings);
      reply = `✅ Үнэ шинэчлэгдлээ:\n${name}: ${price}`;
      break;
    }

    case "/add": {
      const name = args[0];
      const info = args.slice(1).join(" ");
      if (!name) {
        reply = "❌ Формат: /add [нэр] [мэдээлэл]\nЖишээ: /add curling-wand 45000₮ - 4 насадка";
        break;
      }
      settings.products[name] = info || "";
      saveSettings(settings);
      reply = `✅ Бүтээгдэхүүн нэмэгдлээ:\n${name}: ${info || "(мэдээлэл байхгүй)"}`;
      break;
    }

    default:
      return; // Unknown command — ignore silently
  }

  await sendTelegramMessage(reply);
}

// Register Telegram webhook — call this once after deployment
// Requires APP_URL env variable set to your public server URL (e.g. https://era-hair-bot.onrender.com)
app.get("/set-telegram-webhook", (req, res) => {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return res.status(400).json({ error: "APP_URL env variable тохируулаагүй байна." });
  }

  const webhookUrl = `${appUrl}/telegram-reply`;
  const body = JSON.stringify({
    url: webhookUrl,
    secret_token: TELEGRAM_WEBHOOK_SECRET || undefined,
  });

  const options = {
    hostname: "api.telegram.org",
    path: `/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };

  const tgReq = https.request(options, (tgRes) => {
    let data = "";
    tgRes.on("data", (chunk) => (data += chunk));
    tgRes.on("end", () => {
      try {
        const result = JSON.parse(data);
        res.json({ webhookUrl, telegram: result });
      } catch {
        res.json({ webhookUrl, raw: data });
      }
    });
  });

  tgReq.on("error", (err) => res.status(500).json({ error: err.message }));
  tgReq.write(body);
  tgReq.end();
});

app.listen(PORT, () => {
  console.log(`✅ Era Hair Bot сервер ажиллаж байна: http://localhost:${PORT}`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook`);
});
