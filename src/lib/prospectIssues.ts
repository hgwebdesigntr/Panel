interface AuditLike {
  sslOk: boolean;
  performanceScore: number | null;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  hasSchema: boolean;
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  isWordPress: boolean;
}

// Lighthouse/SEO bulgularını web tasarımcı olmayan bir okuyucunun
// anlayacağı, jargonsuz cümlelere çeviriyor. AI teklif metninde ve
// müşteriye giden PDF raporunda aynı liste kullanılıyor.
export function describeIssues(hasWebsite: boolean, audit: AuditLike | null): string[] {
  if (!hasWebsite) {
    return [
      "İşletmenizin bir web sitesi bulunmuyor.",
      "Google'da arama yapan potansiyel müşterileriniz sizi bulamıyor.",
      "Rakipleriniz web sitesi üzerinden müşteri kazanırken siz bu fırsatı kaçırıyorsunuz.",
    ];
  }

  if (!audit) {
    return ["Web siteniz henüz detaylı olarak incelenmedi."];
  }

  const issues: string[] = [];

  if (!audit.sslOk) {
    issues.push("Siteniz güvenli bağlantı (kilit simgesi) kullanmıyor — ziyaretçilere \"güvenli değil\" uyarısı gösterilebiliyor.");
  }
  if (audit.performanceScore != null && audit.performanceScore < 60) {
    issues.push("Siteniz özellikle telefonlarda oldukça yavaş açılıyor, bu yüzden ziyaretçilerin çoğu siteyi açmadan terk ediyor.");
  } else if (audit.performanceScore != null && audit.performanceScore < 80) {
    issues.push("Sitenizin açılış hızı iyileştirmeye açık, bazı ziyaretçiler yavaşlıktan dolayı sabırsızlanabiliyor.");
  }
  if (!audit.hasTitle || !audit.hasMetaDescription) {
    issues.push("Google arama sonuçlarında siteniz eksik/jenerik bir başlık ve açıklamayla görünüyor, bu tıklanma oranını düşürüyor.");
  }
  if (!audit.hasSchema) {
    issues.push("Siteniz Google'a işletmeniz hakkında yeterli bilgi vermiyor, bu da arama sonuçlarında daha az öne çıkmanıza sebep oluyor.");
  }
  if (!audit.hasSitemap || !audit.hasRobotsTxt) {
    issues.push("Google'ın sitenizi düzgün tarayabilmesi için gereken bazı temel teknik ayarlar eksik.");
  }

  if (issues.length === 0) {
    issues.push("Web siteniz genel olarak sağlıklı durumda; birlikte küçük iyileştirmelerle daha da güçlendirebiliriz.");
  }

  return issues;
}
