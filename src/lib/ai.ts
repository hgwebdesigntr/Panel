import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ProspectSummary {
  name: string;
  category: string | null;
  district: string;
  website: string | null;
  hasWebsite: boolean;
  issues: string[];
}

export async function generateOfferText({
  prospect,
  price,
  currency,
  companyName,
}: {
  prospect: ProspectSummary;
  price: number;
  currency: string;
  companyName: string;
}): Promise<string> {
  const issuesText = prospect.issues.length
    ? prospect.issues.map((i) => `- ${i}`).join("\n")
    : "- Web sitesi genel olarak iyi durumda, küçük iyileştirmeler yapılabilir.";

  const prompt = `Sen ${companyName} adlı bir web tasarım ajansı için satış teklifi metni yazan bir asistansın.

İşletme: ${prospect.name} (${prospect.category ?? "işletme"}, ${prospect.district})
Web sitesi durumu: ${prospect.hasWebsite ? prospect.website : "Web sitesi yok"}
Tespit edilen eksikler:
${issuesText}

Teklif fiyatı: ${price.toLocaleString("tr-TR")} ${currency}

Görev: Bu işletmeye gönderilecek, 2-3 kısa paragraflık bir teklif metni yaz. Kurallar:
- Türkçe, sıcak ve profesyonel bir ton kullan, samimi ama saygılı.
- Karşı taraf web tasarımcı DEĞİL — "SEO", "Lighthouse", "Core Web Vitals", "SSL sertifikası" gibi teknik terimler KULLANMA. Bunun yerine "müşterileriniz sizi Google'da bulamıyor", "siteniz telefonda yavaş açılıyor" gibi günlük dille anlat.
- İşletmenin spesifik eksiklerine değin, jenerik konuşma.
- Sonunda nazikçe bir sonraki adımı öner (görüşme, detaylı bilgi vb.) ama fiyatı metnin içinde tekrar yazma, fiyat ayrı gösterilecek.
- Sadece teklif metnini yaz, başlık veya "Merhaba" gibi selamlama ekleme, giriş cümlesiyle başla.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text.trim() : "";
}
