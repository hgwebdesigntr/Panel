export type Severity = "crit" | "warn" | "good" | "info";

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  body: string[];
  term?: { label: string; text: string };
  fix?: string;
}

export interface AuditLike {
  siteHealthScore: number;
  sslOk: boolean;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcp: string | null;
  cls: string | null;
  tbt: string | null;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  h1Count: number | null;
  hasSchema: boolean;
  isWordPress: boolean;
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  auditedAt: Date;
}

export interface ProspectLike {
  name: string;
  category: string | null;
  district: string;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  photoCount: number | null;
  hasOpeningHours: boolean;
}

export interface PeerStats {
  count: number;
  avgRating: number | null;
  avgReviewCount: number | null;
  avgPhotoCount: number | null;
}

export function buildWebsiteFindings(prospect: ProspectLike, audit: AuditLike | null): Finding[] {
  if (!prospect.website) {
    return [
      {
        id: "no-website",
        title: "Web Siteniz Bulunmuyor",
        severity: "crit",
        body: [
          "İşletmenizin bir web sitesi yok. Bugün bir hizmet almadan önce çoğu kişi önce internetten araştırma yapıyor; web siteniz olmadığı için bu kişilerin büyük bir kısmı sizi hiç görmeden rakiplerinize yöneliyor.",
          "Google Haritalar üzerinden bulunabiliyor olabilirsiniz, ama bir web sitesi hizmetlerinizi, fiyat aralığınızı ve sizi neden tercih etmeleri gerektiğini anlatarak asıl güveni inşa eden yer.",
        ],
        fix: "Öncelikle sade, hızlı ve mobil uyumlu bir web sitesiyle başlanmalı; işletme bilgileri, sunulan hizmetler ve iletişim bilgileri net şekilde yer almalı.",
      },
    ];
  }

  if (!audit) {
    return [
      {
        id: "not-audited",
        title: "Web Siteniz Henüz Analiz Edilmedi",
        severity: "warn",
        body: ["Web siteniz bulundu ama detaylı bir teknik analiz henüz tamamlanmadı."],
      },
    ];
  }

  const findings: Finding[] = [];

  if (!audit.sslOk) {
    findings.push({
      id: "ssl",
      title: "Güvenli Bağlantı (SSL) Yok",
      severity: "crit",
      body: [
        "Siteniz güvenli bağlantı kullanmıyor. Tarayıcılar bu durumda ziyaretçilere \"Güvenli Değil\" uyarısı gösteriyor, bu da pek çok kişinin siteden hemen çıkmasına sebep oluyor.",
      ],
      term: {
        label: "SSL nedir?",
        text: "Tarayıcıdaki kilit simgesini sağlayan, sitenizle ziyaretçi arasındaki bağlantıyı şifreleyen teknik bir sertifikadır. Google da güvenli olmayan siteleri arama sonuçlarında geride bırakır.",
      },
      fix: "Hosting sağlayıcınızdan ücretsiz bir SSL sertifikası (Let's Encrypt) kurulması istenmelidir; genelde birkaç dakikada tamamlanır.",
    });
  } else {
    findings.push({
      id: "ssl-good",
      title: "Güvenli Bağlantı Kurulu",
      severity: "good",
      body: ["Siteniz güvenli bağlantı (SSL) kullanıyor, bu konuda bir sorun yok."],
    });
  }

  if (audit.performanceScore != null) {
    if (audit.performanceScore < 50) {
      findings.push({
        id: "perf-critical",
        title: "Site Çok Yavaş Açılıyor",
        severity: "crit",
        body: [
          `Sitenizin mobil hız skoru ${audit.performanceScore}/100 — kritik seviyede düşük. Ziyaretçilerin büyük kısmı, özellikle telefonda, birkaç saniyeden uzun süren siteleri açılmadan terk ediyor.`,
        ],
        term: audit.lcp
          ? { label: "LCP nedir?", text: `Sayfanın ana içeriğinin ekrana gelme süresidir. Şu an ${audit.lcp} — ideali 2,5 saniyenin altıdır.` }
          : undefined,
        fix: "Görsellerin sıkıştırılması, gereksiz kodların temizlenmesi ve önbellekleme kurulması hız sorununu büyük ölçüde çözer.",
      });
    } else if (audit.performanceScore < 80) {
      findings.push({
        id: "perf-warn",
        title: "Site Açılış Hızı Ortalama Düzeyde",
        severity: "warn",
        body: [`Mobil hız skorunuz ${audit.performanceScore}/100. İyileştirmeye açık ama acil bir durum değil.`],
        fix: "Görsel optimizasyonu ve önbellekleme ile skor kolaylıkla 90'ın üzerine çıkarılabilir.",
      });
    } else {
      findings.push({
        id: "perf-good",
        title: "Site Hızı İyi Durumda",
        severity: "good",
        body: [`Mobil hız skorunuz ${audit.performanceScore}/100 — sağlıklı bir seviyede.`],
      });
    }
  }

  if (audit.accessibilityScore != null && audit.accessibilityScore < 70) {
    findings.push({
      id: "a11y",
      title: "Erişilebilirlik Sorunları Var",
      severity: "warn",
      body: [
        `Erişilebilirlik skorunuz ${audit.accessibilityScore}/100. Bu genelde görsellerde açıklama metni eksikliği, düşük renk kontrastı veya küçük dokunma alanları gibi sorunlardan kaynaklanır.`,
      ],
      term: { label: "Neden önemli?", text: "Görme veya hareket güçlüğü yaşayan ziyaretçiler sitenizi daha zor kullanır. Ayrıca Google bu sinyalleri sıralamada da dikkate alır." },
      fix: "Görsellere açıklama metni eklenmesi, yazı kontrastının artırılması ve buton/link alanlarının büyütülmesi bu skoru hızla yükseltir.",
    });
  }

  if (!audit.hasTitle || !audit.hasMetaDescription) {
    findings.push({
      id: "title-meta",
      title: "Google'daki Görünümünüz Eksik",
      severity: "crit",
      body: [
        "Sayfa başlığı ve/veya açıklama metni eksik veya jenerik. Bunlar Google arama sonuçlarında görünen mavi başlık ve altındaki gri açıklamadır — insanların tıklayıp tıklamayacağına buradan karar verir.",
      ],
      fix: "Her sayfaya özgün bir başlık (50-60 karakter) ve açıklama (100-130 karakter) yazılmalı; işletme adı, hizmet ve konum bilgisi içermeli.",
    });
  }

  if (audit.h1Count === 0) {
    findings.push({
      id: "h1",
      title: "Sayfada Ana Başlık (H1) Yok",
      severity: "warn",
      body: ["Sayfanın ne hakkında olduğunu belirten ana başlık (H1) bulunamadı. Bu hem ziyaretçi hem Google için netlik kaybı demek."],
      fix: "Her sayfaya, sayfanın konusunu net anlatan tek bir ana başlık eklenmelidir.",
    });
  }

  if (!audit.hasSchema) {
    findings.push({
      id: "schema",
      title: "Google'a İşletme Bilgisi Verilmiyor",
      severity: "warn",
      body: [
        "Siteniz Google'a işletmeniz hakkında makine tarafından okunabilir bilgi (adres, çalışma saatleri, hizmetler) vermiyor. Bu, arama sonuçlarında yıldız/adres gibi zengin görünümlerin çıkmasını engelliyor.",
      ],
      term: { label: "Yapılandırılmış veri nedir?", text: "Google'a işletmenizi anlatan, sayfanın koduna eklenen özel bir bilgi formatıdır. Doğru kurulunca arama sonuçlarınız daha dikkat çekici görünür." },
      fix: "İşletme türünüze uygun yapılandırılmış veri (LocalBusiness) eklenmesi ve Google'ın \"Rich Results Test\" aracıyla doğrulanması önerilir.",
    });
  }

  if (!audit.hasSitemap || !audit.hasRobotsTxt) {
    findings.push({
      id: "sitemap",
      title: "Google'ın Siteyi Taraması Zorlaşıyor",
      severity: "warn",
      body: [
        `Sitenizde ${!audit.hasSitemap ? "site haritası (sitemap.xml)" : ""}${!audit.hasSitemap && !audit.hasRobotsTxt ? " ve " : ""}${!audit.hasRobotsTxt ? "robots.txt dosyası" : ""} bulunamadı. Bunlar Google'a sitenizdeki tüm sayfaları kolayca bulması için verilen bir yol haritasıdır.`,
      ],
      fix: "Bir sitemap.xml dosyası oluşturulup robots.txt'ye eklenmeli ve Google Search Console'a bildirilmelidir.",
    });
  }

  if (audit.isWordPress) {
    findings.push({
      id: "wp-info",
      title: "Siteniz WordPress İle Kurulu",
      severity: "info",
      body: [
        "Bu bilgi bir sorun değil, teknik bir not: WordPress kullanan sitelerde yukarıdaki sorunların çoğu genellikle doğru eklentilerle (önbellekleme, SEO, görsel optimizasyonu) nispeten hızlı çözülebilir.",
      ],
    });
  }

  return findings;
}

function formatDelta(value: number, avg: number): string {
  const diff = Math.round(((value - avg) / avg) * 100);
  if (Math.abs(diff) < 15) return "bölgedeki benzerlerine yakın";
  return diff > 0 ? `bölge ortalamasının %${diff} üzerinde` : `bölge ortalamasının %${Math.abs(diff)} altında`;
}

export function buildGoogleBusinessFindings(prospect: ProspectLike, peers: PeerStats): Finding[] {
  const findings: Finding[] = [];
  const hasPeerData = peers.count >= 3;

  if (!prospect.reviewCount || prospect.reviewCount === 0) {
    findings.push({
      id: "no-reviews",
      title: "Google Yorumunuz Yok",
      severity: "crit",
      body: [
        "İşletmenizde hiç Google yorumu bulunmuyor. Yeni müşterilerin büyük kısmı bir yere gitmeden önce yorumlara bakıyor; yorumu olmayan bir işletme güvenilirlik açısından geride kalıyor.",
      ],
      fix: "Memnun müşterilerden kısa bir yorum bırakmaları rica edilmeli; ilk 10-15 yorum bile büyük fark yaratır.",
    });
  } else if (hasPeerData && peers.avgReviewCount && prospect.reviewCount < peers.avgReviewCount * 0.5) {
    findings.push({
      id: "low-reviews",
      title: "Yorum Sayınız Bölge Ortalamasının Altında",
      severity: "warn",
      body: [
        `${prospect.reviewCount} yorumunuz var, bölgenizde taranan benzer işletmelerin ortalaması ise ${Math.round(peers.avgReviewCount)}. Yorum sayısı ${formatDelta(prospect.reviewCount, peers.avgReviewCount)}.`,
      ],
      fix: "Müşterilerden düzenli olarak yorum istenmesi (örn. hizmet sonrası bir mesajla) bu farkı kapatır.",
    });
  } else {
    findings.push({
      id: "reviews-good",
      title: "Yorum Sayınız Sağlıklı",
      severity: "good",
      body: [`${prospect.reviewCount} yorumunuz var${hasPeerData && peers.avgReviewCount ? `, bölge ortalaması ${Math.round(peers.avgReviewCount)}` : ""}.`],
    });
  }

  if (prospect.rating != null && prospect.rating < 4.0) {
    findings.push({
      id: "low-rating",
      title: "Puanınız Beklenenin Altında",
      severity: "warn",
      body: [`Google puanınız ${prospect.rating.toFixed(1)}/5. 4,0'ın altındaki puanlar yeni müşterileri tereddüde düşürebilir.`],
      fix: "Olumsuz yorumlara nazikçe yanıt verilmesi ve hizmet kalitesinin iyileştirilmesi puanı zamanla yükseltir.",
    });
  }

  const photoCount = prospect.photoCount ?? 0;

  if (photoCount === 0) {
    findings.push({
      id: "no-photos",
      title: "İşletme Profilinizde Hiç Fotoğraf Yok",
      severity: "crit",
      body: ["Google Haritalar profilinizde fotoğraf bulunmuyor. Fotoğrafsız profiller çok daha az tıklanıyor ve daha az güven veriyor."],
      fix: "İşletme içi, dışı, ürün/hizmet ve ekip fotoğrafları eklenmesi önerilir — en az 10-15 fotoğraf ile başlanabilir.",
    });
  } else if (hasPeerData && peers.avgPhotoCount && photoCount < peers.avgPhotoCount * 0.5) {
    findings.push({
      id: "low-photos",
      title: "Fotoğraf Sayınız Bölge Ortalamasının Altında",
      severity: "warn",
      body: [
        `${photoCount} fotoğrafınız var, bölge ortalaması ${Math.round(peers.avgPhotoCount)}. Fotoğraf sayısı ${formatDelta(photoCount, peers.avgPhotoCount)}.`,
      ],
      fix: "Düzenli olarak yeni fotoğraf eklenmesi profilinizin daha canlı ve güncel görünmesini sağlar.",
    });
  }

  if (!prospect.hasOpeningHours) {
    findings.push({
      id: "no-hours",
      title: "Çalışma Saatleriniz Eksik",
      severity: "warn",
      body: ["Google Haritalar profilinizde çalışma saatleri girilmemiş. Bu bilgi olmayınca ziyaretçiler ne zaman açık olduğunuzu bilmeden arayıp/gelip sizi kapalı bulabiliyor."],
      fix: "Google Business Profile üzerinden çalışma saatlerinin (özel günler dahil) eklenmesi önerilir.",
    });
  }

  return findings;
}

export function overallVerdict(score: number): { label: string; color: "crit" | "warn" | "good" } {
  if (score < 40) return { label: "Acil Müdahale Gerekiyor", color: "crit" };
  if (score < 60) return { label: "Ciddi Eksikler Var", color: "crit" };
  if (score < 80) return { label: "İyileştirme Gerekiyor", color: "warn" };
  return { label: "Sağlıklı Durumda", color: "good" };
}
