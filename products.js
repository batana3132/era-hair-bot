const products = [
  {
    id: 1,
    name: "Wavytalk Heatwave Pro 5-in-1 Curling Wand Set",
    price: "₮349,000",
    description: `🌀 *Wavytalk Heatwave Pro 5-in-1 Curling Wand Set*
💰 Үнэ: *₮349,000*

✨ *Онцлог:*
• 5 төрлийн хошуут: 13мм / 13-25мм / 25мм / 32мм / 38мм
• 5 халааны түвшин: 150°C – 215°C
• LED дэлгэц
• Хос PTC халаагч
• Ион технологи
• 2 жилийн баталгаа

Янз бүрийн буржгар, долгионы хэлбэр бүтээхэд төгс багц!`,
    keywords: ["curling wand", "wand set", "буржгар", "долгион хошуут", "5in1 wand", "curling", "хошуут", "349"],
  },
  {
    id: 2,
    name: "Wavytalk 5-in-1 Air Styler",
    price: "₮249,000",
    description: `💨 *Wavytalk 5-in-1 Air Styler*
💰 Үнэ: *₮249,000*

✨ *Онцлог:*
• Хатаана + шулуун + долгион + буржгар + volume — нэг төхөөрөмжөөр
• Cool shot товч
• 5 төрлийн толгой
• Нэг гараар температур удирдах
• Dyson-тай зүйрлэсэн чанар

Хатааж, хэлбэржүүлж — хоёрыг нэгтэй!`,
    keywords: ["air styler", "air brush", "хатаах хэлбэржүүлэгч", "5in1 air", "хатааж хэлбэржүүлдэг", "air", "styler", "249"],
  },
  {
    id: 3,
    name: "Wavytalk Hair Dryer",
    price: "₮168,000",
    description: `🌬️ *Wavytalk Hair Dryer (Үсний сэнс)*
💰 Үнэ: *₮168,000*

✨ *Онцлог:*
• Ионжуулагч технологи
• 2х хурдан хатаалт
• 3 хошуут: энгийн + diffuser + самтай
• 3 шатлал халаалт + 2 шатлал хурд
• Хүйтэн салхины тохиргоо

Хурдан, эрүүл, гялгар үс!`,
    keywords: ["сэнс", "hair dryer", "фен", "үсний сэнс", "dryer", "хатаах", "168"],
  },
  {
    id: 4,
    name: "Wavytalk Дулаанаар үс хэлбэржүүлэгч",
    price: "₮118,000",
    description: `🔄 *Wavytalk Дулаанаар үс хэлбэржүүлэгч (Rotating Brush)*
💰 Үнэ: *₮118,000*

✨ *Онцлог:*
• Давхар PTC халаагч
• 5 халааны түвшин
• LED дэлгэц
• 10 минутад долгионтуулна
• Ион технологи

Хурдан, хялбар, гоё долгион!`,
    keywords: ["rotating brush", "дулаанаар хэлбэржүүлэгч", "brush", "хэлбэржүүлэгч", "дулаан сам", "rotating", "118"],
  },
];

function findProduct(text) {
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const product of products) {
    let score = 0;
    for (const kw of product.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.length; // longer keyword match = more specific
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  return bestScore > 0 ? best : null;
}

function allProductsSummary() {
  return products
    .map((p) => `• *${p.name}* — ${p.price}`)
    .join("\n");
}

module.exports = { products, findProduct, allProductsSummary };
