import { NextResponse } from "next/server";

// Troy ons → gram katsayısı
const TROY_OZ_TO_GRAM = 31.1035;

// Türk altın birimlerinin gram karşılıkları
const GOLD_GRAMS: Record<string, number> = {
  XAU_GRAM:     1.0,
  XAU_QUARTER:  1.755,   // çeyrek altın
  XAU_HALF:     3.510,   // yarım altın
  XAU_FULL:     7.016,   // tam altın
  XAU_REPUBLIC: 7.216,   // cumhuriyet altını
};

export async function GET() {
  const rates: Record<string, number> = {};

  // Döviz kurları (frankfurter.app — ücretsiz, anahtar gerektirmez)
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP,CHF", {
      next: { revalidate: 3600 },
    });
    const data = await res.json() as { rates: Record<string, number> };
    const usdTry = data.rates.TRY;
    rates.USD = usdTry;
    rates.EUR = usdTry / data.rates.EUR;
    rates.GBP = usdTry / data.rates.GBP;
    rates.CHF = usdTry / data.rates.CHF;
  } catch {
    // Döviz alınamazsa boş geç
  }

  // Altın fiyatı (metals.live — ücretsiz)
  try {
    const res = await fetch("https://api.metals.live/v1/spot/gold", {
      next: { revalidate: 3600 },
    });
    const data = await res.json() as Array<{ gold: number }>;
    const goldUsdOz = data[0]?.gold;
    if (goldUsdOz && rates.USD) {
      const gramTry = (goldUsdOz / TROY_OZ_TO_GRAM) * rates.USD;
      for (const [key, grams] of Object.entries(GOLD_GRAMS)) {
        rates[key] = gramTry * grams;
      }
    }
  } catch {
    // Altın alınamazsa boş geç
  }

  return NextResponse.json({ rates, updatedAt: new Date().toISOString() });
}
