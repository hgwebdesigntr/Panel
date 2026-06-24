import { NextResponse } from "next/server";

const TROY_OZ_TO_GRAM = 31.1035;

const GOLD_GRAMS: Record<string, number> = {
  XAU_GRAM:     1.0,
  XAU_QUARTER:  1.755,
  XAU_HALF:     3.510,
  XAU_FULL:     7.016,
  XAU_REPUBLIC: 7.216,
};

// fawazahmed0/currency-api — jsDelivr CDN üzerinden, ücretsiz, anahtar gerektirmez
const CDN = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies";

export async function GET() {
  const rates: Record<string, number> = {};

  await Promise.all([
    // Döviz: USD bazında TRY, EUR, GBP, CHF
    fetch(`${CDN}/usd.min.json`, { next: { revalidate: 3600 } })
      .then((r) => r.json())
      .then((d: { usd: Record<string, number> }) => {
        const usdTry = d.usd.try;
        rates.USD = usdTry;
        rates.EUR = usdTry / d.usd.eur;
        rates.GBP = usdTry / d.usd.gbp;
        rates.CHF = usdTry / d.usd.chf;
      })
      .catch(() => {}),

    // Altın: XAU bazında doğrudan TRY
    fetch(`${CDN}/xau.min.json`, { next: { revalidate: 3600 } })
      .then((r) => r.json())
      .then((d: { xau: Record<string, number> }) => {
        const tryPerOz = d.xau.try;
        const gramTry  = tryPerOz / TROY_OZ_TO_GRAM;
        for (const [key, grams] of Object.entries(GOLD_GRAMS)) {
          rates[key] = gramTry * grams;
        }
      })
      .catch(() => {}),
  ]);

  return NextResponse.json({ rates, updatedAt: new Date().toISOString() });
}
