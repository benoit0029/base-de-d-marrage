import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { euro } from "@/lib/pdf/format";

// Moteur de template unique pour toutes les activités : seules les données
// passées en props changent (couleur d'accent, logo, mentions). La couleur
// d'accent est utilisée en liseré/texte uniquement — jamais en fond plein
// derrière les montants ou les mentions obligatoires, pour rester lisible.

export interface InvoicePdfLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
}

export interface InvoicePdfData {
  activityLabel: string;
  accentColorHex: string;
  documentTitle: string; // "Devis" ou "Facture"
  number: string;
  issueDate: string;
  dueDate?: string;
  company: {
    legalName: string;
    address: string;
    siren: string;
    vatNumber?: string;
    contactEmail?: string;
  };
  client: {
    name: string;
    address?: string;
  };
  lines: InvoicePdfLine[];
  totalHt: number;
  totalVat: number;
  totalTtc: number;
  vatApplicable: boolean;
  logoDataUri?: string;
  // Mention texte (pas de logo graphique) tant que l'emplacement/taille du
  // logo officiel AB n'ont pas été validés avec le guide INAO — voir
  // docs/ARCHITECTURE.md. Une fois confirmé, remplacer par une <Image>.
  abMentionText?: string;
  extraLegalMentions?: string;
}


const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  topBar: { height: 4, marginBottom: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  logo: { height: 40, marginBottom: 6, objectFit: "contain" },
  companyBlock: { maxWidth: 220 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  meta: { fontSize: 9, color: "#475569" },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 8, textTransform: "uppercase", color: "#64748b", marginBottom: 4 },
  clientBlock: { fontSize: 10 },
  table: { borderTopWidth: 1, borderTopColor: "#cbd5e1" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 4,
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1, textAlign: "right" },
  colVat: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  headerCell: { fontSize: 8, textTransform: "uppercase", color: "#64748b" },
  totalsBlock: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    fontWeight: 700,
  },
  legal: { marginTop: 28, fontSize: 8, color: "#475569", lineHeight: 1.5 },
});

export function InvoiceDocument(data: InvoicePdfData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.topBar, { backgroundColor: data.accentColorHex }]} />

        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            {data.logoDataUri && <Image src={data.logoDataUri} style={styles.logo} />}
            <Text style={{ fontWeight: 700 }}>{data.company.legalName}</Text>
            <Text style={styles.meta}>{data.company.address}</Text>
            <Text style={styles.meta}>SIREN : {data.company.siren}</Text>
            {data.company.vatNumber && <Text style={styles.meta}>TVA : {data.company.vatNumber}</Text>}
            {data.company.contactEmail && <Text style={styles.meta}>{data.company.contactEmail}</Text>}
          </View>
          <View>
            <Text style={[styles.title, { color: data.accentColorHex }]}>{data.documentTitle}</Text>
            <Text style={styles.meta}>{data.activityLabel}</Text>
            <Text style={styles.meta}>N° {data.number}</Text>
            <Text style={styles.meta}>Date : {data.issueDate}</Text>
            {data.dueDate && <Text style={styles.meta}>Échéance : {data.dueDate}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Client</Text>
          <View style={styles.clientBlock}>
            <Text>{data.client.name}</Text>
            {data.client.address && <Text style={styles.meta}>{data.client.address}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDesc, styles.headerCell]}>Désignation</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qté</Text>
            <Text style={[styles.colUnit, styles.headerCell]}>PU HT</Text>
            <Text style={[styles.colVat, styles.headerCell]}>TVA</Text>
            <Text style={[styles.colTotal, styles.headerCell]}>Total HT</Text>
          </View>
          {data.lines.map((line, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{line.description}</Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colUnit}>{euro(line.unitPrice)}</Text>
              <Text style={styles.colVat}>{line.vatRate > 0 ? `${line.vatRate}%` : "—"}</Text>
              <Text style={styles.colTotal}>{euro(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Total HT</Text>
            <Text>{euro(data.totalHt)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>TVA</Text>
            <Text>{data.vatApplicable ? euro(data.totalVat) : "Non applicable"}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text>Total TTC</Text>
            <Text>{euro(data.totalTtc)}</Text>
          </View>
        </View>

        <View style={styles.legal}>
          {!data.vatApplicable && <Text>TVA non applicable, art. 293 B du CGI.</Text>}
          <Text>
            Délai de règlement : 30 jours à compter de la date de facture. Pénalité de
            retard : taux d&apos;intérêt légal en vigueur. Indemnité forfaitaire pour
            frais de recouvrement en cas de retard de paiement : 40 € (professionnels).
          </Text>
          {data.abMentionText && <Text>{data.abMentionText}</Text>}
          {data.extraLegalMentions && <Text>{data.extraLegalMentions}</Text>}
        </View>
      </Page>
    </Document>
  );
}
