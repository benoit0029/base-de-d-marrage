import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import { euro, percent } from "@/lib/pdf/format";

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
  unit?: string;
}

export interface InvoicePdfData {
  activityLabel: string;
  accentColorHex: string;
  documentTitle: string; // "Devis", "Facture" ou "Facture d'avoir"
  creditNoteFor?: string; // avoir : référence de la facture annulée
  number: string;
  issueDate: string;
  dueDate?: string;
  company: {
    legalName: string;
    address: string;
    siren: string;
    vatNumber?: string;
    contactEmail?: string;
    websiteUrl?: string;
    // Organisme certificateur AB (ex. FR-BIO-01), dans les coordonnées.
    abCertificationCode?: string;
  };
  client: {
    name: string;
    address?: string;
    siren?: string;
    vatNumber?: string;
  };
  // RIB imprimé sur les factures à régler par virement.
  bank?: { holder: string; iban: string; bic?: string };
  // Facture réglée le jour même de son émission (paiement en ligne) :
  // « acquittée » au lieu du RIB.
  paidOnIssueDate?: string;
  // Devis : date limite d'acceptation.
  validUntil?: string;
  // Devis Kerbooth entreprise : détail de la prestation et zone de signature
  // « bon pour accord » (ancre Yousign, voir kerbooth/quotes).
  kerboothQuote?: {
    formulaLabel: string;
    photoboothCount: number;
    periods: string[];
    eventLocation: string;
    depositPerUnit: number;
    paymentTermDays: number;
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

// Ancre de signature Yousign (« smart anchor ») : texte blanc minuscule,
// invisible à l'impression, remplacé par le champ de signature quand le
// document est envoyé avec parse_anchors=true. s1 = premier signataire.
export const YOUSIGN_SIGNATURE_ANCHOR = "{{s1|signature|180|60}}";

export function YousignAnchor() {
  return <Text style={{ color: "#ffffff", fontSize: 4 }}>{YOUSIGN_SIGNATURE_ANCHOR}</Text>;
}

interface VatGroup {
  rate: number;
  base: number;
  vat: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * TVA de chaque ligne, calculée comme à la création de la facture (voir
 * createInvoice) ; l'éventuel centime d'écart avec le total enregistré
 * (lignes Kerbooth dont la TVA est extraite du TTC) est reporté sur la ligne
 * de plus gros montant, pour que lignes et détail par taux retombent
 * toujours sur totalVat.
 */
function lineVats(lines: InvoicePdfLine[], totalVat: number): number[] {
  const vats = lines.map((l) => (l.vatRate > 0 ? round2((l.lineTotal * l.vatRate) / 100) : 0));
  const taxed = lines.map((l, i) => i).filter((i) => lines[i].vatRate > 0);
  if (taxed.length === 0) return vats;
  const diff = round2(totalVat - vats.reduce((sum, v) => sum + v, 0));
  if (diff !== 0) {
    const largest = taxed.reduce((a, b) => (lines[b].lineTotal > lines[a].lineTotal ? b : a));
    vats[largest] = round2(vats[largest] + diff);
  }
  return vats;
}

/**
 * Détail de la TVA par taux (base HT et taxe de chaque taux), mention
 * obligatoire dès qu'une facture mélange plusieurs taux (ex. légumes 5,5 %
 * et plants 10 %) — somme de la TVA des lignes (voir lineVats).
 */
function vatBreakdown(lines: InvoicePdfLine[], vats: number[]): VatGroup[] {
  const byRate = new Map<number, VatGroup>();
  lines.forEach((l, i) => {
    if (l.vatRate <= 0) return;
    const g = byRate.get(l.vatRate) ?? { rate: l.vatRate, base: 0, vat: 0 };
    g.base = round2(g.base + l.lineTotal);
    g.vat = round2(g.vat + vats[i]);
    byRate.set(l.vatRate, g);
  });
  return [...byRate.values()].sort((a, b) => a.rate - b.rate);
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
  colTtc: { flex: 1, textAlign: "right" },
  headerCell: { fontSize: 8, textTransform: "uppercase", color: "#64748b" },
  totalsBlock: { marginTop: 12, alignSelf: "flex-end", width: 260 },
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
  bankBlock: { marginTop: 20, padding: 8, borderWidth: 1, borderColor: "#cbd5e1", fontSize: 9 },
  signatureBlock: { marginTop: 24, width: 240, minHeight: 90, borderTopWidth: 1, borderTopColor: "#94a3b8", paddingTop: 6 },
});

export function InvoiceDocument(data: InvoicePdfData) {
  const vats = data.vatApplicable ? lineVats(data.lines, data.totalVat) : data.lines.map(() => 0);
  const vatGroups = data.vatApplicable ? vatBreakdown(data.lines, vats) : [];
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
            {data.company.abCertificationCode && (
              <Text style={styles.meta}>
                Certification Agriculture Biologique : {data.company.abCertificationCode}
              </Text>
            )}
            {data.company.contactEmail && <Text style={styles.meta}>{data.company.contactEmail}</Text>}
            {data.company.websiteUrl && (
              <Link src={data.company.websiteUrl} style={[styles.meta, { textDecoration: "none" }]}>
                {data.company.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </Link>
            )}
          </View>
          <View>
            <Text style={[styles.title, { color: data.accentColorHex }]}>{data.documentTitle}</Text>
            <Text style={styles.meta}>{data.activityLabel}</Text>
            <Text style={styles.meta}>N° {data.number}</Text>
            <Text style={styles.meta}>Date : {data.issueDate}</Text>
            {data.creditNoteFor && <Text style={styles.meta}>{data.creditNoteFor}</Text>}
            {data.dueDate && <Text style={styles.meta}>Échéance : {data.dueDate}</Text>}
            {data.validUntil && <Text style={styles.meta}>Valable jusqu&apos;au : {data.validUntil}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Client</Text>
          <View style={styles.clientBlock}>
            <Text>{data.client.name}</Text>
            {data.client.address && <Text style={styles.meta}>{data.client.address}</Text>}
            {data.client.siren && <Text style={styles.meta}>SIREN/SIRET : {data.client.siren}</Text>}
            {data.client.vatNumber && <Text style={styles.meta}>TVA : {data.client.vatNumber}</Text>}
          </View>
        </View>

        {data.kerboothQuote && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Prestation</Text>
            <Text>
              Formule : {data.kerboothQuote.formulaLabel} — {data.kerboothQuote.photoboothCount}{" "}
              photobooth{data.kerboothQuote.photoboothCount > 1 ? "s" : ""} 360°
            </Text>
            {data.kerboothQuote.periods.map((p, i) => (
              <Text key={i} style={styles.meta}>
                {data.kerboothQuote!.periods.length > 1 ? `Prestation ${i + 1} : ` : "Date : "}
                {p}
              </Text>
            ))}
            <Text style={styles.meta}>Lieu d&apos;installation : {data.kerboothQuote.eventLocation}</Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDesc, styles.headerCell]}>Désignation</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qté</Text>
            <Text style={[styles.colUnit, styles.headerCell]}>PU HT</Text>
            <Text style={[styles.colVat, styles.headerCell]}>TVA</Text>
            <Text style={[styles.colTotal, styles.headerCell]}>Total HT</Text>
            <Text style={[styles.colTtc, styles.headerCell]}>Total TTC</Text>
          </View>
          {data.lines.map((line, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{line.description}</Text>
              <Text style={styles.colQty}>
                {String(line.quantity).replace(".", ",")}
                {line.unit ? ` ${line.unit}` : ""}
              </Text>
              <Text style={styles.colUnit}>{euro(line.unitPrice)}</Text>
              <Text style={styles.colVat}>{line.vatRate > 0 ? percent(line.vatRate) : "—"}</Text>
              <Text style={styles.colTotal}>{euro(line.lineTotal)}</Text>
              <Text style={styles.colTtc}>{euro(line.lineTotal + vats[i])}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Total HT</Text>
            <Text>{euro(data.totalHt)}</Text>
          </View>
          {vatGroups.length > 0 ? (
            vatGroups.map((g) => (
              <View key={g.rate} style={styles.totalsRow}>
                <Text>
                  TVA {percent(g.rate)} sur {euro(g.base)}
                </Text>
                <Text>{euro(g.vat)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.totalsRow}>
              <Text>TVA</Text>
              <Text>{data.vatApplicable ? euro(data.totalVat) : "Non applicable"}</Text>
            </View>
          )}
          <View style={styles.totalsRowFinal}>
            <Text>Total TTC</Text>
            <Text>{euro(data.totalTtc)}</Text>
          </View>
        </View>

        {data.paidOnIssueDate ? (
          <View style={styles.legal}>
            <Text style={{ fontWeight: 700 }}>Facture acquittée le {data.paidOnIssueDate}.</Text>
          </View>
        ) : (
          data.bank &&
          data.documentTitle === "Facture" && (
            <View style={styles.bankBlock}>
              <Text style={styles.sectionLabel}>Règlement par virement</Text>
              <Text>Titulaire : {data.bank.holder}</Text>
              <Text>IBAN : {data.bank.iban}</Text>
              {data.bank.bic && <Text>BIC : {data.bank.bic}</Text>}
              <Text style={styles.meta}>Référence à indiquer : {data.number}</Text>
            </View>
          )
        )}

        {data.kerboothQuote && (
          <View style={styles.legal}>
            <Text>
              Règlement par virement, à réception de la facture émise à la signature, au plus
              tard {data.kerboothQuote.paymentTermDays} jours après celle-ci. Caution : chèque
              de {euro(data.kerboothQuote.depositPerUnit)} par photobooth (soit{" "}
              {euro(data.kerboothQuote.depositPerUnit * data.kerboothQuote.photoboothCount)}),
              remis à la livraison et restitué à la récupération du matériel. Conditions :
              contrat de location et conditions générales de location aux professionnels
              joints.
            </Text>
          </View>
        )}

        <View style={styles.legal}>
          {!data.vatApplicable && <Text>TVA non applicable, art. 293 B du CGI.</Text>}
          {!data.creditNoteFor && (
            <Text>
              Délai de règlement :{" "}
              {data.dueDate
                ? `au plus tard le ${data.dueDate}`
                : data.kerboothQuote
                  ? "voir ci-dessus"
                  : "30 jours à compter de la date de facture"}
              .
              Pénalités de retard : trois fois le taux d&apos;intérêt légal en vigueur.
              Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement :
              40 € (professionnels). Pas d&apos;escompte pour paiement anticipé.
            </Text>
          )}
          {data.abMentionText && <Text>{data.abMentionText}</Text>}
          {data.extraLegalMentions && <Text>{data.extraLegalMentions}</Text>}
        </View>

        {data.kerboothQuote && (
          <View style={styles.signatureBlock} wrap={false}>
            <Text style={{ fontWeight: 700 }}>Bon pour accord — le Client</Text>
            <Text style={styles.meta}>Signature électronique (Yousign) valant acceptation du devis</Text>
            <YousignAnchor />
          </View>
        )}
      </Page>
    </Document>
  );
}
