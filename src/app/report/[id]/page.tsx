import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  buildWebsiteFindings,
  buildGoogleBusinessFindings,
  overallVerdict,
  type Finding,
} from "@/lib/auditAnalysis";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({ where: { id }, select: { name: true } });
  return { title: prospect ? `Durum Raporu — ${prospect.name}` : "Durum Raporu" };
}

function FindingCard({ finding }: { finding: Finding }) {
  const pillLabel = { crit: "Kritik", warn: "Önemli", good: "İyi", info: "Bilgi" }[finding.severity];
  return (
    <div className={`card issue issue-${finding.severity}`}>
      <div className="issue-top">
        <h4>{finding.title}</h4>
        <span className={`pill pill-${finding.severity}`}>{pillLabel}</span>
      </div>
      {finding.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {finding.term && (
        <div className="term">
          <b>{finding.term.label}</b> {finding.term.text}
        </div>
      )}
      {finding.fix && (
        <div className="fix">
          <b>Ne yapılmalı:</b> {finding.fix}
        </div>
      )}
    </div>
  );
}

function Gauge({ label, sub, value }: { label: string; sub: string; value: number | null }) {
  const color = value == null ? "#9aa1ad" : value < 60 ? "var(--crit)" : value < 80 ? "var(--warn)" : "var(--good)";
  return (
    <div className="card gauge">
      <div className="ring" style={{ background: `conic-gradient(${color} ${value ?? 0}%, var(--line) 0)` }}>
        <span style={{ color }}>{value ?? "—"}</span>
      </div>
      <div className="g-label">{label}</div>
      <div className="g-sub">{sub}</div>
    </div>
  );
}

export default async function ProspectReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: { audits: { orderBy: { auditedAt: "desc" }, take: 1 } },
  });
  if (!prospect) notFound();

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const audit = prospect.audits[0] ?? null;

  const peerAgg = await prisma.prospect.aggregate({
    where: {
      district: prospect.district,
      category: prospect.category,
      id: { not: prospect.id },
      reviewCount: { not: null },
    },
    _avg: { rating: true, reviewCount: true, photoCount: true },
    _count: { _all: true },
  });
  const peers = {
    count: peerAgg._count._all,
    avgRating: peerAgg._avg.rating,
    avgReviewCount: peerAgg._avg.reviewCount,
    avgPhotoCount: peerAgg._avg.photoCount,
  };

  const websiteFindings = buildWebsiteFindings(prospect, audit);
  const gbpFindings = buildGoogleBusinessFindings(prospect, peers);
  const allFindings = [...websiteFindings, ...gbpFindings];

  const critFindings = allFindings.filter((f) => f.severity === "crit");
  const warnFindings = allFindings.filter((f) => f.severity === "warn");
  const goodFindings = allFindings.filter((f) => f.severity === "good");
  const infoFindings = allFindings.filter((f) => f.severity === "info");

  const overallScore = !prospect.website ? 12 : audit ? audit.siteHealthScore : 40;
  const verdict = overallVerdict(overallScore);

  const overviewParagraphs: string[] = [];
  if (!prospect.website) {
    overviewParagraphs.push(
      `${prospect.name} için en büyük eksik net: bir web siteniz yok. Google Haritalar üzerinden bulunabiliyorsunuz, ama sizi arayan pek çok kişi bir web sitesi olmadan işletmenize güvenip güvenmeyeceğine karar veremiyor.`
    );
  } else {
    overviewParagraphs.push(
      `${prospect.name} sitesinde ${critFindings.length} kritik, ${warnFindings.length} önemli bulgu tespit edildi${goodFindings.length ? `, ${goodFindings.length} alanda ise durum iyi` : ""}. Aşağıda her biri tek tek, ne anlama geldiği ve nasıl düzeltileceğiyle birlikte açıklanıyor.`
    );
  }
  if (gbpFindings.some((f) => f.severity === "crit" || f.severity === "warn")) {
    overviewParagraphs.push(
      "Web sitesinin yanında Google Haritalar profilinde de iyileştirilebilecek noktalar var — bunlar genellikle web sitesinden daha hızlı ve ücretsiz şekilde düzeltilebilir."
    );
  }

  const scanDate = (audit?.auditedAt ?? new Date()).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: REPORT_CSS }} />
      <div className="report-root">
        <header className="masthead">
          <div className="wrap">
            <div className="tags">
              <span className="tag">{prospect.district}</span>
              {prospect.category && <span className="tag">{prospect.category}</span>}
            </div>
            <h1>{prospect.name}</h1>
            <div className="meta-row">
              <span>{prospect.website ? prospect.website.replace(/^https?:\/\//, "") : "Web sitesi yok"}</span>
              <span>Rapor tarihi: {scanDate}</span>
              <span>Kaynak: Lighthouse · Google Haritalar</span>
            </div>
          </div>
        </header>

        <section>
          <div className="wrap">
            <div className="score-hero">
              <div className="score-big" style={{ color: `var(--${verdict.color})` }}>
                {overallScore}
                <small>/100</small>
              </div>
              <div className="score-txt">
                <p className="score-verdict" style={{ color: `var(--${verdict.color})` }}>{verdict.label}</p>
                {overviewParagraphs.map((p, i) => (
                  <p key={i} className={i > 0 ? "tight" : undefined}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {prospect.website && audit && (
          <section>
            <div className="wrap">
              <div className="sec"><span className="sec-n">1</span><h2>Web Sitesi Skor Panosu</h2></div>
              <p className="sec-lead">Google'ın kendi ölçüm aracı Lighthouse ile mobil cihaz üzerinden yapılan ölçüm sonuçları.</p>
              <div className="gauge-grid">
                <Gauge label="Performans" sub="Hız / yüklenme" value={audit.performanceScore} />
                <Gauge label="Erişilebilirlik" sub="Herkes kullanabiliyor mu" value={audit.accessibilityScore} />
                <Gauge label="En İyi Uygulamalar" sub="Güvenlik / standartlar" value={audit.bestPracticesScore} />
                <Gauge label="SEO (Teknik)" sub="Temel SEO kuralları" value={audit.seoScore} />
              </div>
              {(audit.lcp || audit.cls || audit.tbt) && (
                <div className="metrics" style={{ marginTop: 16 }}>
                  {audit.lcp && <div className="card metric"><div className="v">{audit.lcp}</div><div className="n">İçerik yüklenme süresi (LCP)</div></div>}
                  {audit.cls && <div className="card metric"><div className="v">{audit.cls}</div><div className="n">Görsel kayma (CLS)</div></div>}
                  {audit.tbt && <div className="card metric"><div className="v">{audit.tbt}</div><div className="n">Tıklama engelleme (TBT)</div></div>}
                </div>
              )}
            </div>
          </section>
        )}

        <section>
          <div className="wrap">
            <div className="sec"><span className="sec-n">2</span><h2>Google Haritalar / İşletme Profili</h2></div>
            <p className="sec-lead">
              Google Places verisinden alınan işletme profili durumu{peers.count >= 3 ? `, ${prospect.district} bölgesinde taranan ${peers.count} benzer işletmeyle karşılaştırmalı olarak` : ""}.
            </p>
            <div className="metrics">
              <div className="card metric"><div className="v">{prospect.rating != null ? prospect.rating.toFixed(1) : "—"}</div><div className="n">Google puanı</div></div>
              <div className="card metric"><div className="v">{prospect.reviewCount ?? 0}</div><div className="n">Yorum sayısı</div></div>
              <div className="card metric"><div className="v">{prospect.photoCount ?? 0}</div><div className="n">Fotoğraf sayısı</div></div>
              <div className="card metric"><div className="v">{prospect.hasOpeningHours ? "Var" : "Yok"}</div><div className="n">Çalışma saatleri</div></div>
            </div>
          </div>
        </section>

        {critFindings.length > 0 && (
          <section>
            <div className="wrap">
              <div className="sec"><span className="sec-n">3</span><h2>Önce Düzeltilmesi Gerekenler</h2></div>
              <p className="sec-lead">En yüksek etkiye sahip, öncelikli sorunlar.</p>
              {critFindings.map((f) => <FindingCard key={f.id} finding={f} />)}
            </div>
          </section>
        )}

        {(warnFindings.length > 0 || infoFindings.length > 0) && (
          <section>
            <div className="wrap">
              <div className="sec"><span className="sec-n">4</span><h2>İyileştirilebilecek Diğer Noktalar</h2></div>
              {warnFindings.map((f) => <FindingCard key={f.id} finding={f} />)}
              {infoFindings.map((f) => <FindingCard key={f.id} finding={f} />)}
            </div>
          </section>
        )}

        {goodFindings.length > 0 && (
          <section>
            <div className="wrap">
              <div className="sec"><span className="sec-n">5</span><h2>Sağlıklı Olan Noktalar</h2></div>
              {goodFindings.map((f) => <FindingCard key={f.id} finding={f} />)}
            </div>
          </section>
        )}

        <section className="last-section">
          <div className="wrap">
            <div className="sec"><span className="sec-n">6</span><h2>Öncelik Sırası</h2></div>
            <div className="plan">
              {critFindings.length > 0 && (
                <div className="phase phase-crit">
                  <div className="phase-title"><span className="phase-badge">1</span>Bu hafta</div>
                  <ul>{critFindings.map((f) => <li key={f.id}>{f.title}</li>)}</ul>
                </div>
              )}
              {warnFindings.length > 0 && (
                <div className="phase phase-warn">
                  <div className="phase-title"><span className="phase-badge">2</span>Bu ay</div>
                  <ul>{warnFindings.map((f) => <li key={f.id}>{f.title}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer>
          <div className="wrap">
            Bu rapor Google Places API ve Lighthouse verilerinden {settings?.companyName || "HG Web Design"} tarafından otomatik oluşturulmuştur · {scanDate}
            <br />
            Rakamlar tarama anına aittir ve zamanla değişebilir.
          </div>
        </footer>
      </div>
    </>
  );
}

const REPORT_CSS = `
  :root{
    --paper:#F5F6F8; --panel:#FFFFFF; --ink:#13161C; --ink-soft:#545B68; --line:#E1E4EA;
    --accent:#3730A3; --accent-soft:#EEEDFA;
    --crit:#A32626; --crit-soft:#FBEAEA;
    --warn:#92400E; --warn-soft:#FDF3E3;
    --good:#166534; --good-soft:#E7F6EC;
    --info:#3B4252; --info-soft:#EEF0F4;
    --radius:12px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  .report-root{font-family:'Archivo',system-ui,sans-serif;color:var(--ink);background:var(--paper);line-height:1.6;font-size:16px;min-height:100vh}
  .wrap{max-width:860px;margin:0 auto;padding:0 24px}
  h1,h2,h4{font-family:'Archivo',sans-serif;letter-spacing:-.01em}

  header.masthead{background:var(--ink);color:#fff;padding:48px 0 40px}
  .tags{display:flex;gap:8px;margin-bottom:14px}
  .tag{font-size:.78rem;font-weight:600;padding:4px 12px;border-radius:99px;background:rgba(255,255,255,.14);color:#fff}
  header.masthead h1{font-size:2.1rem;font-weight:800;margin-bottom:14px;max-width:20ch}
  .meta-row{display:flex;flex-wrap:wrap;gap:8px 20px;font-size:.85rem;opacity:.78;padding-top:18px;border-top:1px solid rgba(255,255,255,.16)}

  section{padding:36px 0;border-bottom:1px solid var(--line)}
  section.last-section{border-bottom:none}
  .sec{display:flex;align-items:baseline;gap:14px;margin-bottom:6px}
  .sec-n{font-family:'Archivo';font-weight:800;font-size:1.6rem;color:var(--line)}
  h2{font-size:1.4rem;font-weight:700}
  .sec-lead{color:var(--ink-soft);font-size:.98rem;margin:8px 0 22px;max-width:70ch}

  p{margin:0 0 12px;color:var(--ink-soft);font-size:.95rem}
  p.tight{margin-top:-4px}
  strong,b{color:var(--ink);font-weight:600}

  .score-hero{display:flex;gap:28px;align-items:center;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:28px}
  .score-big{font-family:'Archivo';font-weight:800;font-size:3.6rem;line-height:1}
  .score-big small{font-size:1.1rem;color:var(--ink-soft);font-weight:500}
  .score-txt{flex:1;min-width:260px}
  .score-verdict{font-weight:700;font-size:1.05rem;margin-bottom:8px}

  .card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius)}

  .gauge-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
  .gauge{padding:20px 14px;text-align:center}
  .ring{width:88px;height:88px;border-radius:50%;margin:0 auto 10px;display:grid;place-items:center;position:relative}
  .ring::before{content:"";position:absolute;inset:9px;background:var(--panel);border-radius:50%}
  .ring span{position:relative;font-family:'Archivo';font-weight:700;font-size:1.35rem}
  .g-label{font-weight:600;font-size:.88rem}
  .g-sub{font-size:.75rem;color:var(--ink-soft);margin-top:2px}

  .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
  .metric{padding:16px}
  .metric .v{font-family:'Archivo';font-weight:700;font-size:1.4rem}
  .metric .n{font-size:.78rem;color:var(--ink-soft);margin-top:2px}

  .issue{padding:18px 20px;margin-bottom:14px;border-left:4px solid var(--line)}
  .issue-crit{border-left-color:var(--crit)}
  .issue-warn{border-left-color:var(--warn)}
  .issue-good{border-left-color:var(--good)}
  .issue-info{border-left-color:var(--info)}
  .issue-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
  .issue h4{font-size:1rem;font-weight:700;flex:1;min-width:180px}
  .pill{font-size:.68rem;font-weight:700;padding:3px 10px;border-radius:99px;white-space:nowrap}
  .pill-crit{background:var(--crit-soft);color:var(--crit)}
  .pill-warn{background:var(--warn-soft);color:var(--warn)}
  .pill-good{background:var(--good-soft);color:var(--good)}
  .pill-info{background:var(--info-soft);color:var(--info)}
  .issue p:last-child{margin-bottom:0}
  .term{background:var(--accent-soft);border-radius:8px;padding:11px 14px;margin-top:10px;font-size:.87rem;color:var(--ink-soft)}
  .term b{color:var(--accent)}
  .fix{background:var(--paper);border-radius:8px;padding:11px 14px;margin-top:10px;font-size:.87rem;color:var(--ink-soft)}
  .fix b{color:var(--ink)}

  .plan{display:grid;gap:20px}
  .phase-title{display:flex;align-items:center;gap:10px;font-weight:700;font-size:1rem;margin-bottom:10px}
  .phase-badge{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;color:#fff;font-size:.85rem;font-weight:700}
  .phase-crit .phase-badge{background:var(--crit)}
  .phase-warn .phase-badge{background:var(--warn)}
  .plan ul{list-style:none;display:grid;gap:6px}
  .plan li{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px 14px;font-size:.9rem}

  footer{padding:28px 0 48px;color:var(--ink-soft);font-size:.8rem;text-align:center}

  @media(max-width:600px){
    header.masthead h1{font-size:1.6rem}
    .score-big{font-size:2.6rem}
  }
`;
