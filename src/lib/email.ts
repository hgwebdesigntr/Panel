import nodemailer from "nodemailer";

function createTransport() {
  const port = parseInt(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
}

const CYCLE: Record<string, string> = {
  MONTHLY: "Aylık", QUARTERLY: "3 Aylık", SEMI_ANNUAL: "6 Aylık", ANNUAL: "Yıllık",
};
const TYPE: Record<string, string> = {
  SERVER: "Sunucu", VPS: "VPS", HOSTING: "Hosting", DOMAIN: "Domain",
  DOMAIN_HOSTING: "Domain + Hosting", SSL: "SSL", OTHER: "Diğer",
};

export interface RenewalNotificationParams {
  to: string;
  serverName: string;
  serverType: string;
  domain?: string | null;
  ip?: string | null;
  customer?: {
    name: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  daysLeft: number;
  renewalDate: string;
  price?: number | null;
  currency: string;
  billingCycle: string;
  lastPayment?: {
    amount: number;
    currency: string;
    paidAt: string;
  } | null;
}

export async function sendRenewalNotification(params: RenewalNotificationParams) {
  const {
    to, serverName, serverType, domain, ip, customer,
    daysLeft, renewalDate, price, currency, billingCycle, lastPayment,
  } = params;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "";

  const urgency = daysLeft === 0 ? "🚨" : daysLeft === 1 ? "🚨" : daysLeft <= 3 ? "❗" : daysLeft <= 7 ? "⚠️" : "📅";
  const daysLabel =
    daysLeft === 0 ? "Bugün son gün!" :
    daysLeft === 1 ? "Yarın bitiyor!" :
    `${daysLeft} gün kaldı`;

  const headerBg =
    daysLeft === 0 ? "#dc2626" : daysLeft === 1 ? "#dc2626" :
    daysLeft <= 3 ? "#ea580c" : daysLeft <= 7 ? "#d97706" : "#4f46e5";

  const urgencyBg =
    daysLeft <= 3 ? "#fef2f2" : daysLeft <= 7 ? "#fffbeb" : "#eef2ff";
  const urgencyBorder =
    daysLeft <= 3 ? "#fecaca" : daysLeft <= 7 ? "#fde68a" : "#c7d2fe";
  const urgencyTextColor =
    daysLeft <= 3 ? "#dc2626" : daysLeft <= 7 ? "#d97706" : "#4f46e5";

  const subject = `${urgency} ${daysLabel}: ${serverName}`;

  // ── Hizmet bilgileri satırları
  const domainRow = domain
    ? `<tr><td style="padding:5px 0 5px;color:#64748b;font-size:13px;width:130px">Domain</td><td style="padding:5px 0;color:#4f46e5;font-size:13px;font-family:monospace">${domain}</td></tr>`
    : "";
  const ipRow = ip
    ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">IP Adresi</td><td style="padding:5px 0;color:#334155;font-size:13px;font-family:monospace">${ip}</td></tr>`
    : "";

  // ── Müşteri bilgileri bloğu
  let customerBlock = "";
  if (customer) {
    const companyRow = customer.company
      ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px;width:130px">Firma</td><td style="padding:5px 0;color:#1e293b;font-size:13px">${customer.company}</td></tr>`
      : "";
    const emailRow = customer.email
      ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">E-posta</td><td style="padding:5px 0;font-size:13px"><a href="mailto:${customer.email}" style="color:#4f46e5;text-decoration:none">${customer.email}</a></td></tr>`
      : "";
    const phoneRow = customer.phone
      ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">Telefon</td><td style="padding:5px 0;color:#1e293b;font-size:13px">${customer.phone}</td></tr>`
      : "";
    customerBlock = `
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px">
        <tr><td colspan="2" style="padding:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #f1f5f9">Müşteri Bilgileri</td></tr>
        <tr><td style="padding:8px 0 5px;color:#64748b;font-size:13px;width:130px">Ad Soyad</td><td style="padding:8px 0 5px;color:#1e293b;font-size:13px;font-weight:600">${customer.name}</td></tr>
        ${companyRow}${emailRow}${phoneRow}
      </table>`;
  }

  // ── Fiyat satırı
  const priceRow = price != null
    ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px;width:130px">Dönem Ücreti</td><td style="padding:5px 0;color:#1e293b;font-size:13px;font-weight:600">${fmt(price, currency)} / ${CYCLE[billingCycle] ?? billingCycle}</td></tr>`
    : "";

  // ── Son ödeme satırı
  const lastPayRow = lastPayment
    ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">Son Ödeme</td><td style="padding:5px 0;color:#059669;font-size:13px;font-weight:600">${fmt(lastPayment.amount, lastPayment.currency)} — ${new Date(lastPayment.paidAt).toLocaleDateString("tr-TR")}</td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto">

  <!-- Header -->
  <div style="background:${headerBg};border-radius:12px 12px 0 0;padding:24px 28px">
    <div style="font-size:32px;margin-bottom:8px;line-height:1">${urgency}</div>
    <h1 style="margin:0;color:#fff;font-size:21px;font-weight:700;line-height:1.3">${serverName}</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px">${daysLabel}</p>
  </div>

  <!-- Body -->
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,.07)">

    <!-- Hizmet Bilgileri -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:22px">
      <tr><td colspan="2" style="padding:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #f1f5f9">Hizmet Bilgileri</td></tr>
      <tr><td style="padding:8px 0 5px;color:#64748b;font-size:13px;width:130px">Hizmet Adı</td><td style="padding:8px 0 5px;color:#1e293b;font-size:13px;font-weight:600">${serverName}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;font-size:13px">Tür</td><td style="padding:5px 0;color:#1e293b;font-size:13px">${TYPE[serverType] ?? serverType}</td></tr>
      ${domainRow}${ipRow}
    </table>

    <!-- Müşteri -->
    ${customerBlock}

    <!-- Yenileme & Ödeme -->
    <div style="background:${urgencyBg};border:1px solid ${urgencyBorder};border-radius:10px;padding:18px 20px">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:${urgencyTextColor};text-transform:uppercase;letter-spacing:.08em">Yenileme &amp; Ödeme</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:5px 0;color:#64748b;font-size:13px;width:130px">Son Geçerlilik</td><td style="padding:5px 0;color:#1e293b;font-size:13px;font-weight:600">${renewalDate}</td></tr>
        <tr><td style="padding:5px 0;color:#64748b;font-size:13px">Kalan Süre</td><td style="padding:5px 0;font-size:15px;font-weight:700;color:${headerBg}">${daysLabel}</td></tr>
        <tr><td style="padding:5px 0;color:#64748b;font-size:13px">Yenileme Dönemi</td><td style="padding:5px 0;color:#1e293b;font-size:13px">${CYCLE[billingCycle] ?? billingCycle}</td></tr>
        ${priceRow}${lastPayRow}
      </table>
    </div>

  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px 0 0">
    <p style="margin:0;font-size:11px;color:#94a3b8">Bu e-posta HGweb Panel tarafından otomatik gönderilmiştir.</p>
  </div>

</div>
</body>
</html>`;

  return createTransport().sendMail({ from, to, subject, html });
}
