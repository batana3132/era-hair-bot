require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { findProduct, allProductsSummary } = require("./products");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN олдсонгүй. .env файлаа шалгана уу.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
console.log("✅ Era Hair Bot ажиллаж байна...");

const WELCOME = `Сайн байна уу! 👋 *Era Hair* дэлгүүрт тавтай морил!

Бид Wavytalk брэндийн дараах бүтээгдэхүүнүүдийг санал болгож байна:

${allProductsSummary()}

Ямар бүтээгдэхүүний талаар мэдэхийг хүсч байна вэ? Нэрийг нь бичнэ үү эсвэл доорх товчлуурыг дарна уу. 👇`;

const MAIN_KEYBOARD = {
  reply_markup: {
    keyboard: [
      ["🌀 Curling Wand Set", "💨 Air Styler"],
      ["🌬️ Hair Dryer", "🔄 Rotating Brush"],
      ["📋 Бүх бүтээгдэхүүн", "📞 Холбоо барих"],
    ],
    resize_keyboard: true,
  },
};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, WELCOME, {
    parse_mode: "Markdown",
    ...MAIN_KEYBOARD,
  });
});

bot.on("message", (msg) => {
  if (!msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // ignore commands handled by onText
  if (text.startsWith("/start")) return;

  // all products list
  if (text.includes("Бүх бүтээгдэхүүн") || text === "/products") {
    return bot.sendMessage(
      chatId,
      `📋 *Манай бүх бүтээгдэхүүн:*\n\n${allProductsSummary()}\n\nАль нэгийн тухай дэлгэрэнгүй мэдэх үү? Нэрийг нь бичнэ үү!`,
      { parse_mode: "Markdown", ...MAIN_KEYBOARD }
    );
  }

  // contact
  if (text.includes("Холбоо барих") || text === "/contact") {
    return bot.sendMessage(
      chatId,
      `📞 *Холбоо барих:*\n\n📱 Утас: өөрийн дугаараа энд бичнэ үү\n📍 Хаяг: өөрийн хаягаа энд бичнэ үү\n🕐 Цагийн хуваарь: Даваа–Бямба 10:00–20:00`,
      { parse_mode: "Markdown", ...MAIN_KEYBOARD }
    );
  }

  // keyboard button aliases
  const aliases = {
    "🌀 Curling Wand Set": "curling wand",
    "💨 Air Styler": "air styler",
    "🌬️ Hair Dryer": "hair dryer",
    "🔄 Rotating Brush": "rotating brush",
  };

  const searchText = aliases[text] || text;
  const product = findProduct(searchText);

  if (product) {
    return bot.sendMessage(chatId, product.description, {
      parse_mode: "Markdown",
      ...MAIN_KEYBOARD,
    });
  }

  // fallback
  bot.sendMessage(
    chatId,
    `Уучлаарай, "${text}" гэсэн бүтээгдэхүүн олдсонгүй. 😊\n\nДоорх бүтээгдэхүүнүүдээс сонгоно уу:`,
    { parse_mode: "Markdown", ...MAIN_KEYBOARD }
  );
});
