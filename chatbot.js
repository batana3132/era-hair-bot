require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const { allProductsSummary } = require("./products");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Та Era Hair дэлгүүрийн AI туслах бот юм. Wavytalk брэндийн үсний тоног төхөөрөмж зардаг Монгол дэлгүүрт ажиллаж байна.

Манай бүтээгдэхүүнүүд:
${allProductsSummary()}

Таны үүрэг:
- Хэрэглэгчдэд бүтээгдэхүүний мэдээлэл, үнэ, онцлогийг тайлбарлах
- Захиалга авах үед: хэрэглэгчийн нэр, утасны дугаар, бүтээгдэхүүн, тоо ширхэгийг тодруулах
- Гомдол, санал хүсэлтийг найрсагаар хүлээн авч шийдвэрлэх
- Монгол хэлээр харилцах (хэрэглэгч өөр хэл хэрэглэвэл тухайн хэлээр хариулж болно)

Хүргэлтийн мэдээлэл: Улаанбаатар хотод үнэгүй хүргэлт, 1-3 ажлын өдөрт хүрнэ.
Баталгаа: Бүх бүтээгдэхүүнд 2 жилийн баталгаа.
Холбоо барих: Facebook Messenger эсвэл утсаар.

Найрсаг, тусч, мэргэжлийн байдлаар богино тодорхой хариулна уу. Нэг мессежинд хэт урт текст бичихгүй байна уу.`;

// Per-user conversation history stored in memory
const conversations = new Map();
const MAX_HISTORY = 20;

function getHistory(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  return conversations.get(userId);
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

function clearHistory(userId) {
  conversations.delete(userId);
}

async function chat(userId, userMessage) {
  addToHistory(userId, "user", userMessage);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: getHistory(userId),
  });

  const reply = response.content[0].text;
  addToHistory(userId, "assistant", reply);
  return reply;
}

function isOrderIntent(message) {
  const keywords = [
    "авна", "авахыг хүсч", "захиалъя", "захиална", "захиалахыг хүсч",
    "авмаар", "авъя", "худалдаж авна", "buy", "order", "хэдэн вэ", "хаанаас авах",
  ];
  const lower = message.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function isComplaintIntent(message) {
  const keywords = [
    "гомдол", "муу", "ажиллахгүй", "эвдэрсэн", "буцаах", "буцааж",
    "буруу", "бүтэхгүй", "тааруу", "баталгаа", "complaint", "broken",
    "refund", "return", "хугарсан", "дулаацахгүй",
  ];
  const lower = message.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

module.exports = { chat, clearHistory, isOrderIntent, isComplaintIntent };
