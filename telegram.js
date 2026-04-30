require("dotenv").config();
const https = require("https");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendTelegramMessage(text, fbSenderId = null) {
  return new Promise((resolve) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("⚠️ Telegram тохиргоо дутуу байна (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).");
      return resolve();
    }

    const fullText = fbSenderId
      ? `${text}\n\n🔗 FBID: ${fbSenderId}\n💬 Reply to this message to respond to customer directly`
      : text;

    const body = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: fullText,
      parse_mode: "HTML",
    });

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      res.on("data", () => {});
      res.on("end", resolve);
    });

    req.on("error", (err) => {
      console.error("Telegram алдаа:", err.message);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

async function sendOrderNotification({ userId, userName, message }) {
  const text =
    `🛍️ <b>Шинэ захиалга!</b>\n\n` +
    `👤 Хэрэглэгч: ${userName || "Тодорхойгүй"}\n` +
    `🆔 Facebook ID: ${userId}\n` +
    `💬 Мессеж:\n${message}\n\n` +
    `⏰ ${new Date().toLocaleString("mn-MN")}`;
  await sendTelegramMessage(text);
}

async function sendComplaintAlert({ userId, userName, message }) {
  const text =
    `⚠️ <b>Гомдол / Санал хүсэлт!</b>\n\n` +
    `👤 Хэрэглэгч: ${userName || "Тодорхойгүй"}\n` +
    `🆔 Facebook ID: ${userId}\n` +
    `💬 Мессеж:\n${message}\n\n` +
    `⏰ ${new Date().toLocaleString("mn-MN")}`;
  await sendTelegramMessage(text);
}

module.exports = { sendTelegramMessage, sendOrderNotification, sendComplaintAlert };
