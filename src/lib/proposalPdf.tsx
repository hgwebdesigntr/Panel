import { describeIssues } from "@/lib/prospectIssues";
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";

Font.register({
  family: "Roboto",
  fonts: [
    { src: "https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Roboto", fontSize: 11, color: "#1e293b" },
  eyebrow: { fontSize: 9, color: "#6366f1", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 20, marginBottom: 8 },
  sub: { fontSize: 10, color: "#64748b", marginBottom: 16 },
  box: { backgroundColor: "#f8fafc", borderRadius: 6, padding: 14, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  stackRow: { marginBottom: 6 },
  label: { fontSize: 9, color: "#64748b" },
  value: { fontSize: 11, fontWeight: 700 },
  paragraph: { fontSize: 11, lineHeight: 1.6, marginBottom: 8 },
  issueItem: { flexDirection: "row", marginBottom: 6 },
  bullet: { width: 12, fontSize: 11 },
  issueText: { flex: 1, fontSize: 10.5, lineHeight: 1.5 },
  priceBox: { backgroundColor: "#eef2ff", borderRadius: 6, padding: 16, marginTop: 16, alignItems: "center" },
  priceLabel: { fontSize: 9, color: "#4338ca", marginBottom: 4 },
  priceValue: { fontSize: 22, fontWeight: 700, color: "#4338ca" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

interface ProposalPdfInput {
  prospect: {
    name: string;
    category: string | null;
    district: string;
    phone: string | null;
    address: string | null;
    website: string | null;
    audits: Array<{
      sslOk: boolean;
      performanceScore: number | null;
      hasTitle: boolean;
      hasMetaDescription: boolean;
      hasSchema: boolean;
      hasSitemap: boolean;
      hasRobotsTxt: boolean;
      isWordPress: boolean;
    }>;
  };
  proposal: {
    price: number;
    currency: string;
    offerText: string;
    demoUrl: string | null;
  };
  settings: {
    companyName: string;
    companyPhone: string;
    companyEmail: string;
    companyAddress: string;
  } | null;
}

export async function renderProposalPdf({ prospect, proposal, settings }: ProposalPdfInput): Promise<Buffer> {
  const issues = describeIssues(Boolean(prospect.website), prospect.audits[0] ?? null);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>Teklif Veri Sayfası — Canva şablonuna kopyalamak için</Text>
        <Text style={styles.h1}>{prospect.name}</Text>
        <Text style={styles.sub}>{[prospect.category, prospect.district].filter(Boolean).join(" · ")}</Text>

        <View style={styles.box}>
          <View style={styles.stackRow}>
            <Text style={styles.label}>İşletme Adı</Text>
            <Text style={styles.value}>{prospect.name}</Text>
          </View>
          {prospect.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Telefon</Text>
              <Text style={styles.value}>{prospect.phone}</Text>
            </View>
          )}
          {prospect.address && (
            <View style={styles.stackRow}>
              <Text style={styles.label}>Adres</Text>
              <Text style={styles.value}>{prospect.address}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Web Sitesi</Text>
            <Text style={styles.value}>{prospect.website || "Yok"}</Text>
          </View>
          {proposal.demoUrl && (
            <View style={styles.row}>
              <Text style={styles.label}>Demo Linki</Text>
              <Text style={styles.value}>{proposal.demoUrl}</Text>
            </View>
          )}
        </View>

        <Text style={styles.h2}>Tespit Edilen Eksikler</Text>
        {issues.map((issue, i) => (
          <View key={i} style={styles.issueItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.issueText}>{issue}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Teklif Metni</Text>
        {proposal.offerText.split("\n\n").map((para, i) => (
          <Text key={i} style={styles.paragraph}>{para}</Text>
        ))}

        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>TEKLİF FİYATI</Text>
          <Text style={styles.priceValue}>
            {proposal.price.toLocaleString("tr-TR")} {proposal.currency}
          </Text>
        </View>

        <Text style={styles.h2}>Gönderen Firma</Text>
        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>Firma</Text>
            <Text style={styles.value}>{settings?.companyName || "-"}</Text>
          </View>
          {settings?.companyPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Telefon</Text>
              <Text style={styles.value}>{settings.companyPhone}</Text>
            </View>
          )}
          {settings?.companyEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>E-posta</Text>
              <Text style={styles.value}>{settings.companyEmail}</Text>
            </View>
          )}
          {settings?.companyAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Adres</Text>
              <Text style={styles.value}>{settings.companyAddress}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          Bu sayfa Canva şablonuna elle aktarım için hazırlanmıştır, müşteriye doğrudan gönderilmek üzere tasarlanmamıştır.
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
