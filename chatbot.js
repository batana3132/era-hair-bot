require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const { sendTelegramMessage } = require("./telegram");
const { getSettings } = require("./settings");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_PROMPT = `Чи Era Hair Mongolia дэлгүүрийн захиалга боловсруулах туслах юм. Монгол хэлээр хариулна. Markdown ашиглахгүй.

ЗӨВХӨН доорх тохиолдолд хариулна. Бусад бүх тохиолдолд хариулт ӨГӨХГҮЙ.

━━━ ХАРИУЛАХ ТОХИОЛДЛУУД ━━━

1. Хэрэглэгч хаяг болон утасны дугаар хоёулыг өгвөл:
→ "Заа таны захиалгыг авлаа. 1-2 хоногт хүргэгднэ, баярлалаа ☺ 100-240V вольт цахилгаанд ашиглана уу. Үүнээс их хүчдэлд холбовол гэмтэх магадлалтай."
   send_telegram_alert-ийг "order" төрлөөр дуудах. message талбарт: "Утас: [дугаар]\nХаяг: [хаяг]"

2. Хүргэлт хэзээ ирэх вэ гэж асуувал:
→ "24-48 цагийн дотор хүргэнэ. Захиалга авсаны маргааш нь хүргэлт гарна 😊"

3. Яг хэдэн цагт ирэх вэ гэж асуувал:
→ "Цаг заах боломжгүй ээ, өдөртөө хүргэнэ 😊"

4. Яг одоо авах / очиж авах гэвэл:
→ "Манай хүргэлтийн агуулхаас очиж авах боломжтой 😊. 100 айл, MNBC телевизийн урд 48-р байрны хажууд Сүн Сүн экспресс. Цагийн хуваарь: Ажлын өдөр 10:00-16:30, Амралтын өдөр 10:00-13:30. Google Maps дээр сүн сүн гээд гарч ирнэ. Мөн ubcab-аар авах боломжтой, ubcab-ийн төлбөр өөрөөс нь гарна."

5. Хүргэлт хэд вэ / хүргэлтийн төлбөр асуувал:
→ "Үнэгүй 😊"

6. Мөнгөө хэзээ хийх вэ / хэзээ төлөх вэ гэвэл:
→ "Авахдаа төлж болно 😊"

7. Мөнгөө одоо хийе / урьдчилж төлье гэвэл:
→ "Хаан банк
5312020642 - Батцагаан
IBAN: 790005005312020642
Гүйлгээний утга: Утасны дугаар"

8. StorePay гэж дурдвал:
→ "StorePay байгаа, та дугаараа үлдээгээрэй, нэмэхэмжлэл явуулая 😊"
   Хэрэглэгч дугаараа өгвөл → send_telegram_alert-ийг "storepay" төрлөөр дуудах. customer_phone талбарт дугаарыг оруулах.

9. Бүтээгдэхүүн ажиллахгүй / эвдэрсэн / гэмтсэн / асахгүй гэвэл:
→ "Бичлэгээ явуулаад өгөөрэй 😊"
   send_telegram_alert-ийг "defect" төрлөөр дуудах. message талбарт хэрэглэгчийн мессежийг оруулах.

10. Жолоочийн дугаар асуувал:
→ "Менежер удахгүй хариулна 😊"
    send_telegram_alert-ийг "driver_phone" төрлөөр дуудах.

11. Хэрэглэгч мэндчилгээ илгээвэл (сайн байна уу, сайн уу, нүүр, hi, hello, байна уу, муу биш, сайхан, юу байна, мэнд, эсвэл ямар ч мэндчилгээ):
→ "Сайн байна уу? Та аль барааг сонирхож байна вэ? 😊"

━━━ БҮХ БУСАД ТОХИОЛДОЛ ━━━
Мэндчилгээ, бүтээгдэхүүний асуулт, үнийн асуулт, хэрхэн ашиглах, харьцуулалт, санамсаргүй мессеж болон ДУРЫН өөр зүйл:
→ send_telegram_alert-ийг "unhandled" төрлөөр дуудах. message талбарт хэрэглэгчийн мессежийг бүтнээр нь оруулах.
→ ХЭРЭГЛЭГЧИД ЯМАР Ч ТЕКСТ ХАРИУЛТ ӨГӨХГҮЙ. Tool дуудсаны дараа бүрэн зогс. Текст гаргахгүй.`;

function buildSystemPrompt(settings) {
  let prompt = BASE_PROMPT;

  if (settings.products && Object.keys(settings.products).length > 0) {
    prompt += "\n\n━━━ БҮТЭЭГДЭХҮҮН / ҮНЭ ━━━\n";
    for (const [name, info] of Object.entries(settings.products)) {
      prompt += `• ${name}: ${info}\n`;
    }
  }

  if (settings.instructions && settings.instructions.length > 0) {
    prompt += "\n\n━━━ НЭМЭЛТ ДҮРМҮҮД (эдгээрийг заавал дагана) ━━━\n";
    settings.instructions.forEach((inst, i) => {
      prompt += `${i + 1}. ${inst}\n`;
    });
  }

  return prompt;
}

const TOOLS = [
  {
    name: "send_telegram_alert",
    description: "Telegram-аар эзэнд мэдэгдэл явуул.",
    input_schema: {
      type: "object",
      properties: {
        alert_type: {
          type: "string",
          enum: ["order", "storepay", "defect", "driver_phone", "unhandled"],
          description: "Мэдэгдлийн төрөл",
        },
        message: {
          type: "string",
          description: "Эзэнд явуулах мэдэгдлийн агуулга",
        },
        customer_phone: {
          type: "string",
          description: "Хэрэглэгчийн утасны дугаар (StorePay болон захиалгын үед)",
        },
      },
      required: ["alert_type", "message"],
    },
  },
];

const conversations = new Map();
const MAX_HISTORY = 30;

function getHistory(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  return conversations.get(userId);
}

function trimHistory(history) {
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

function clearHistory(userId) {
  conversations.delete(userId);
}

async function handleTool(name, input, meta) {
  if (name !== "send_telegram_alert") return "Тодорхойгүй хэрэгсэл.";

  const { alert_type, message, customer_phone } = input;
  const ts = new Date().toLocaleString("mn-MN");
  const user = meta.userName || "Тодорхойгүй";
  const id = meta.userId || "-";

  let text;
  switch (alert_type) {
    case "order":
      text =
        `🛍️ <b>Шинэ захиалга!</b>\n\n` +
        `👤 Хэрэглэгч: ${user}\n` +
        `💬 ${message}\n\n` +
        `⏰ ${ts}`;
      break;
    case "storepay":
      text =
        `💳 <b>StorePay үүсгүүлий гэнээ</b>\n\n` +
        `👤 ${user}\n` +
        `📱 Утас: ${customer_phone || "тодорхойгүй"}\n` +
        `⏰ ${ts}`;
      break;
    case "defect":
      text =
        `⚠️ <b>Гомдол — Бүтээгдэхүүн гэмтсэн!</b>\n\n` +
        `👤 ${user}\n` +
        `💬 ${message}\n\n` +
        `⏰ ${ts}`;
      break;
    case "driver_phone":
      text =
        `📞 <b>Жолоочийн дугаар асуусан</b>\n\n` +
        `👤 ${user}\n` +
        `⏰ ${ts}`;
      break;
    case "unhandled":
      text =
        `👁️ <b>Хариулаагүй мессеж</b>\n\n` +
        `👤 ${user}\n` +
        `💬 ${message}\n\n` +
        `⏰ ${ts}`;
      break;
    default:
      text =
        `⚠️ <b>Мэдэгдэл</b>\n\n` +
        `👤 ${user}\n` +
        `💬 ${message}\n\n` +
        `⏰ ${ts}`;
  }

  await sendTelegramMessage(text, id !== "-" ? id : null);
  return "Telegram-д мэдэгдэл явуулсан.";
}

async function chat(userId, userMessage, meta = {}) {
  const settings = getSettings();
  if (!settings.enabled) return null;

  const history = getHistory(userId);
  history.push({ role: "user", content: userMessage });
  trimHistory(history);

  const systemPrompt = buildSystemPrompt(settings);

  let response;
  do {
    response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      temperature: 0,
      system: systemPrompt,
      messages: history,
      tools: TOOLS,
    });

    if (response.stop_reason === "tool_use") {
      history.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await handleTool(block.name, block.input, meta);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      history.push({ role: "user", content: toolResults });
      trimHistory(history);
    }
  } while (response.stop_reason === "tool_use");

  const textBlock = response.content.find((b) => b.type === "text");
  const reply = textBlock ? textBlock.text.trim() : null;

  if (reply) {
    history.push({ role: "assistant", content: reply });
    trimHistory(history);
  }

  return reply;
}

module.exports = { chat, clearHistory };
