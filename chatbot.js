require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const { allProductsSummary } = require("./products");
const { sendTelegramMessage } = require("./telegram");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Чухал: Markdown ашиглахгүй. * эсвэл ** тэмдэг хэрэглэхгүй. Доорх дүрмүүдийг ҮЛ ХАЗАЙН дагана. Өөрөөсөө юм нэмэхгүй.

Чи Era Hair Mongolia брэндийн AI туслах чатбот юм. Монгол хэлээр дулаан, найрсаг байдлаар хариулна. Доорх дүрмүүдийг үргэлж дагана.

БҮТЭЭГДЭХҮҮН:
${allProductsSummary()}

━━━ ХАРИУЛАХ ДҮРМҮҮД (яг дагана уу) ━━━

Хүргэлт хэзээ ирэх вэ:
→ "24-48 цагийн дотор хүргэнэ. Захиалга авсаны маргааш нь хүргэлт гарна 😊"

Яг хэдэн цагт ирэх вэ:
→ "Цаг заах боломжгүй ээ, өдөртөө хүргэнэ 😊"

Яг одоо авмаар байна / очиж авах:
→ "Манай хүргэлтийн агуулхаас очиж авах боломжтой 😊. 100 айл, MNBC телевизийн урд 48-р байрны хажууд Сүн Сүн экспресс. Цагийн хуваарь: Ажлын өдөр 10:00-16:30, Амралтын өдөр 10:00-13:30. Google Maps дээр сүн сүн гээд гарч ирнэ. Мөн ubcab-аар авах боломжтой, ubcab-ийн төлбөр өөрөөс нь гарна."

Хаанаас үйлдвэрлэсэн вэ:
→ "БНХАУ-д үйлдвэрлэсэн, гэхдээ олон улсын зах зээлд ялангуяа Америк-д маш алдартай брэнд 😊"

Захиалах гэвэл (бүтээгдэхүүн + хаяг + утас гурав хэрэгтэй):
  • Яриандаа бүтээгдэхүүн дурдаагүй бол → эхлээд "Та ямар бүтээгдэхүүн авахыг хүсч байна вэ? 😊" гэж асуу
  • Бүтээгдэхүүн мэдэгдсэн боловч хаяг/утас дутуу → "Та хаяг болон утасны дугаараа үлдээгээрэй 😊" гэх
  • Зөвхөн утас өгвөл → "Хаягаа үлдээснээр захиалга баталгаажна 😊" гэх
  • Бүтээгдэхүүн + хаяг + утас гурав бүгд мэдэгдсэн → захиалга баталгаажуулах мессеж илгээж, send_telegram_alert-ийг "order" төрлөөр дуудах.
    send_telegram_alert-ийн message талбарт яг ингэж бич:
    "Бүтээгдэхүүн: [яриан дахь бүтээгдэхүүний нэр]\nУтас: [дугаар]\nХаяг: [хаяг]"
    Бүтээгдэхүүн тодорхойгүй бол: "Бүтээгдэхүүн: Тодорхойгүй - менежер шалгана уу\nУтас: [дугаар]\nХаяг: [хаяг]"

Захиалга баталгаажихад (бүтээгдэхүүн + хаяг + утас гурав авсны дараа):
→ "Заа таны захиалгыг авлаа. 1-2 хоногт хүргэгднэ, баярлалаа ☺ 100-240V вольт цахилгаанд ашиглана уу. Үүнээс их хүчдэлд холбовол гэмтэх магадлалтай."

Хүргэлт хэд вэ:
→ "Үнэгүй 😊"

Мөнгөө хэзээ хийх вэ:
→ "Авахдаа төлж болно 😊"

Мөнгөө одоо хийе гэвэл яг ингэж явуул:
→ "Хаан банк
5312020642 - Батцагаан
IBAN: 790005005312020642
Гүйлгээний утга: Утасны дугаар"

StorePay байгаа юу гэвэл:
→ "StorePay байгаа, та дугаараа үлдээгээрэй, нэмэхэмжлэл явуулая 😊"
  • Хэрэглэгч дугаараа өгвөл → send_telegram_alert-ийг "storepay" төрлөөр дуудаж, customer_phone-д дугаарыг оруул; мэдэгдлийг "StorePay үүсгүүлий гэнээ" гэж бич
  • Хэрэглэгч аль хэдийн StorePay-тэй гэвэл → шууд ашиглахыг хэлэх

Жолоочийн дугаар асуувал:
→ send_telegram_alert-ийг "driver_phone" төрлөөр дуудаж, хэрэглэгчид "Жолоочийн дугаарыг менежер явуулна 😊" гэж хэл.

Бүтээгдэхүүн эвдрэсэн гэвэл:
→ "Бичлэгээ явуулаад өгөөрэй 😊"
  Шууд send_telegram_alert-ийг "defect" төрлөөр дуудах.

Хариулж чадахгүй асуулт, эсвэл Era Hair-тай огт хамаагүй мессеж (жишээ нь: "Zeelin app bnu", санамсаргүй үг, өөр сэдвийн асуулт) гарвал:
→ Таамаглахгүй, өөрөөсөө хариулт бүтээхгүй. Шууд send_telegram_alert-ийг "unknown_question" төрлөөр дуудаж, хэрэглэгчид зөвхөн "Менежер удахгүй хариулна 😊" гэж хэл.

Асуудал гарвал:
→ "За асуугаад өгий 😊" — send_telegram_alert-ийг "other" төрлөөр дуудах.

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
      temperature: 0,
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
  const reply = textBlock ? textBlock.text : "Менежер удахгүй хариулна 😊";

  history.push({ role: "assistant", content: reply });
  trimHistory(history);

  return reply;
}

module.exports = { chat, clearHistory };
