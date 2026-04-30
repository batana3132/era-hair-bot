require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const { allProductsSummary } = require("./products");
const { sendTelegramMessage } = require("./telegram");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Та Era Hair Mongolia дэлгүүрийн AI туслах бот юм. Wavytalk брэндийн үсний тоног төхөөрөмж зардаг.

Манай бүтээгдэхүүнүүд:
${allProductsSummary()}

━━━ ХАРИУЛАХ ДҮРМҮҮД (яг дагана уу) ━━━

ХҮРГЭЛТИЙН ХУГАЦАА асуувал:
→ "24-48 цагийн дотор хүргэнэ. Захиалга авсаны маргааш нь хүргэлт гарна."

ЯГ ЦАГ асуувал (хэдэн цагт ирэх гэх мэт):
→ "Цаг заах боломжгүй ээ, өдөртөө хүргэнэ 😊"

ӨӨРӨӨ АВАХЫГ ХҮСВЭЛ / ОДОО АВЧ БОЛОХ УУ гэвэл:
→ "Манай хүргэлтийн агуулхаас очиж авах боломжтой 😊. 100 айл, MNBC телевизийн урд 48-р байрны хажууд Сүн Сүн экспресс. Цагийн хуваарь: Ажлын өдөр 10:00-16:30, Амралтын өдөр 10:00-13:30. Google Maps дээр сүн сүн гээд гарч ирнэ."
  Мөн UBCab хэрэглэж авч болно гэдгийг нэмж хэлэх, UBCab-ийн төлбөрийг хэрэглэгч өөрөө төлнө.

ХААНА ҮЙЛДВЭРЛЭСЭН асуувал:
→ "БНХАУ-д үйлдвэрлэсэн, гэхдээ олон улсын зах зээлд ялангуяа Америк-д маш алдартай брэнд 😊"

ЗАХИАЛАХЫГ ХҮСВЭЛ:
→ "Та хаяг болон утасны дугаараа үлдээгээрэй 😊"
  • Зөвхөн утас өгвөл → хаяг хэрэгтэй гэж хэлэх
  • Хаяг + утас хоёулаа өгвөл → доорх ЗАХИАЛГЫН БАТАЛГААЖУУЛАХ МЕССЕЖ илгээж, send_telegram_alert-ийг "order" төрлөөр дуудах

ЗАХИАЛГЫН БАТАЛГААЖУУЛАХ МЕССЕЖ (хаяг + утас авсны дараа):
→ "Заа таны захиалгыг авлаа. 1-2 хоногт хүргэгднэ, баярлалаа ☺ 100-240V вольт цахилгаанд ашиглана уу. Үүнээс их хүчдэлд холбовол гэмтэх магадлалтай."

ХҮРГЭЛТИЙН ҮНЭ асуувал:
→ "Үнэгүй 😊"

ХЭЗЭЭ ТӨЛӨХ асуувал:
→ "Авахдаа төлж болно 😊"

ОДОО ТӨЛӨХИЙГ ХҮСВЭЛ (урьдчилж шилжүүлэх):
→ Яг ингэж илгээ:
"Хаан банк
5312020642 - Батцагаан
IBAN: 790005005312020642
Гүйлгээний утга: Утасны дугаар"

STOREPAY асуувал:
→ "StorePay байгаа, та дугаараа үлдээгээрэй, нэмэхэмжлэл явуулая 😊"
  • Хэрэглэгч дугаараа өгвөл → send_telegram_alert-ийг "storepay" төрлөөр дуудаж, customer_phone-д дугаарыг оруул
  • Хэрэглэгч аль хэдийн StorePay-тэй гэвэл → шууд ашиглахыг хэлэх

ХАРИУЛЖ ЧАДАХГҮЙ АСУУЛТ гарвал:
→ Таамаглахгүй. Шууд send_telegram_alert-ийг "unknown_question" төрлөөр дуудаж, хэрэглэгчид "Одоо шалгаад хариулъя даа 😊" гэж хэл.

ЖОЛООЧИЙН УТАСНЫ ДУГААР асуувал:
→ Дугаарыг өгөхгүй. send_telegram_alert-ийг "driver_phone" төрлөөр дуудаж, хэрэглэгчид "Жолоочтой холбоо тогтооно ☺" гэж хэл.

БҮТЭЭГДЭХҮҮН ЭВДЭРСЭН / ГЭМТСЭН бол:
→ "Бичлэгээ явуулаад өгөөрэй 😊"
  Шууд send_telegram_alert-ийг "defect" төрлөөр дуудах.

БУСАД АСУУДАЛ гарвал:
→ "За асуугаад өгий 😊"
  send_telegram_alert-ийг "other" төрлөөр дуудах.

━━━ ЕРӨНХИЙ ДҮРМҮҮД ━━━
• Үргэлж дулаан, найрсаг Монгол хэлээр хариул
• 😊 emoji байгалийн байдлаар хэрэглэ
• Мэдэхгүй зүйлийг таамаглахгүй — шууд send_telegram_alert ашигла
• Богино, тодорхой хариулна уу`;

const TOOLS = [
  {
    name: "send_telegram_alert",
    description: "Telegram-аар эзэнд мэдэгдэл явуул. Захиалга баталгаажуулах, StorePay, гомдол, хариулж чадаагүй асуулт болон бусад чухал тохиолдолд заавал ашигла.",
    input_schema: {
      type: "object",
      properties: {
        alert_type: {
          type: "string",
          enum: ["order", "storepay", "defect", "unknown_question", "driver_phone", "other"],
          description: "Мэдэгдлийн төрөл",
        },
        message: {
          type: "string",
          description: "Эзэнд явуулах мэдэгдлийн агуулга (хэрэглэгчийн асуулт эсвэл захиалгын дэлгэрэнгүй)",
        },
        customer_phone: {
          type: "string",
          description: "Хэрэглэгчийн утасны дугаар (StorePay болон захиалгын үед оруулна)",
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
        `🆔 ID: ${id}\n` +
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
        `🆔 ID: ${id}\n` +
        `💬 ${message}\n\n` +
        `⏰ ${ts}`;
      break;
    case "unknown_question":
      text =
        `❓ <b>Хариулж чадаагүй асуулт</b>\n\n` +
        `👤 ${user}\n` +
        `🆔 ID: ${id}\n` +
        `💬 ${message}\n\n` +
        `⏰ ${ts}`;
      break;
    case "driver_phone":
      text =
        `📞 <b>Жолоочийн дугаар асуусан</b>\n\n` +
        `👤 ${user}\n` +
        `🆔 ID: ${id}\n` +
        `⏰ ${ts}`;
      break;
    default:
      text =
        `⚠️ <b>Анхааруулга</b>\n\n` +
        `👤 ${user}\n` +
        `🆔 ID: ${id}\n` +
        `💬 ${message}\n\n` +
        `⏰ ${ts}`;
  }

  await sendTelegramMessage(text);
  return "Telegram-д мэдэгдэл явуулсан.";
}

async function chat(userId, userMessage, meta = {}) {
  const history = getHistory(userId);
  history.push({ role: "user", content: userMessage });
  trimHistory(history);

  let response;
  do {
    response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
  const reply = textBlock ? textBlock.text : "Уучлаарай, хариулж чадсангүй. Дахин оролдоно уу. 🙏";

  history.push({ role: "assistant", content: reply });
  trimHistory(history);

  return reply;
}

module.exports = { chat, clearHistory };
