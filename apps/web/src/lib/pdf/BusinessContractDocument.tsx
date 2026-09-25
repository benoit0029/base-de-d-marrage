import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { euro } from "@/lib/pdf/format";
import { YousignAnchor } from "@/lib/pdf/InvoiceDocument";
import { CGV_PRO_ARTICLES, CGV_PRO_TITLE, CGV_PRO_VALIDATED } from "@/lib/kerbooth/cgvPro";

// Contrat de location pour un devis ENTREPRISE (D-160), signé dans la même
// demande Yousign que le devis. Distinct du contrat du site (particuliers,
// ContractDocument.tsx), qui reste inchangé. Les conditions générales de
// location aux professionnels sont annexées à la suite.

export interface BusinessContractPdfData {
  loueur: { legalName: string; address: string; siren: string };
  client: { name: string; address?: string; siren?: string };
  devisNumber: string;
  formulaLabel: string;
  photoboothCount: number;
  periods: string[];
  eventLocation: string;
  totalTtc: number;
  vatApplicable: boolean;
  paymentTermDays: number;
  depositPerUnit: number;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b", lineHeight: 1.5 },
  draft: { fontSize: 9, color: "#b91c1c", textAlign: "center", marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#475569", textAlign: "center", marginBottom: 20 },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  partyBlock: { maxWidth: 240 },
  partyLabel: { fontSize: 8, textTransform: "uppercase", color: "#64748b", marginBottom: 4 },
  partyName: { fontWeight: 700 },
  meta: { fontSize: 9, color: "#475569" },
  intro: { marginBottom: 16 },
  clause: { marginBottom: 10 },
  clauseNumber: { fontWeight: 700 },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 32 },
  signatureBlock: { width: 220, minHeight: 90, borderTopWidth: 1, borderTopColor: "#94a3b8", paddingTop: 6 },
  cgvTitle: { fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 2 },
  cgvArticle: { marginBottom: 8, fontSize: 9 },
  cgvArticleTitle: { fontWeight: 700 },
  footer: { marginTop: 24, fontSize: 8, color: "#64748b" },
});

export function BusinessContractDocument(data: BusinessContractPdfData) {
  const units = `${data.photoboothCount} photobooth${data.photoboothCount > 1 ? "s" : ""} 360°`;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {!CGV_PRO_VALIDATED && <Text style={styles.draft}>PROJET — texte en attente de validation</Text>}
        <Text style={styles.title}>CONTRAT DE LOCATION — PHOTOBOOTH 360°</Text>
        <Text style={styles.subtitle}>Clients professionnels</Text>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Le Loueur</Text>
            <Text style={styles.partyName}>{data.loueur.legalName}</Text>
            <Text style={styles.meta}>{data.loueur.address}</Text>
            <Text style={styles.meta}>SIREN : {data.loueur.siren}</Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Le Locataire</Text>
            <Text style={styles.partyName}>{data.client.name}</Text>
            {data.client.address && <Text style={styles.meta}>{data.client.address}</Text>}
            {data.client.siren && <Text style={styles.meta}>SIREN/SIRET : {data.client.siren}</Text>}
          </View>
        </View>

        <Text style={styles.intro}>Il a été convenu ce qui suit :</Text>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>1. Objet — </Text>
            Mise à disposition, sans animation ni présence du Loueur pendant l&apos;usage, de {units},
            formule « {data.formulaLabel} », à {data.eventLocation}, pour :
          </Text>
          {data.periods.map((p, i) => (
            <Text key={i} style={styles.meta}>
              {"  • "}
              {data.periods.length > 1 ? `Prestation ${i + 1} : ` : ""}
              {p}
            </Text>
          ))}
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>2. Prix et paiement — </Text>
            {euro(data.totalTtc)}
            {data.vatApplicable ? " TTC" : " (TVA non applicable, art. 293 B du CGI)"}, selon le devis n°{" "}
            {data.devisNumber}. Facture émise à la signature, payable par virement au plus tard{" "}
            {data.paymentTermDays} jours après son émission (conditions générales, article 4).
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>3. Livraison et récupération — </Text>
            Le Loueur installe le matériel avant le début de chaque prestation et le récupère à la
            fin. Le Locataire n&apos;est pas assisté par un animateur pendant la location.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>4. Garde du matériel — </Text>
            De la livraison à la récupération, le Locataire a la garde du matériel et en répond
            conformément à l&apos;article 1732 du Code civil.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>5. Dépôt de garantie — </Text>
            Un chèque de caution de {euro(data.depositPerUnit)} par photobooth, soit{" "}
            {euro(data.depositPerUnit * data.photoboothCount)}, est remis au Loueur à la livraison
            (état des lieux d&apos;entrée) et restitué à la récupération, sauf dégradation constatée
            à l&apos;état des lieux de sortie.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>6. Obligations du Locataire — </Text>
            Espace adapté et accès électrique, information de ses invités sur l&apos;utilisation de
            leurs images, assurance couvrant sa responsabilité de locataire et le matériel confié.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>7. Documents contractuels — </Text>
            Le présent contrat, le devis n° {data.devisNumber} et les conditions générales de
            location aux professionnels ci-annexées, que le Locataire reconnaît avoir lues et
            acceptées. En cas de contradiction, le présent contrat prévaut, puis le devis.
          </Text>
        </View>

        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBlock}>
            <Text>Le Loueur</Text>
            <Text style={styles.meta}>{data.loueur.legalName}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text>Le Locataire</Text>
            <Text style={styles.meta}>Signature électronique (Yousign)</Text>
            <YousignAnchor />
          </View>
        </View>

        <Text style={styles.footer}>Devis n° {data.devisNumber} — Signé électroniquement via Yousign.</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        {!CGV_PRO_VALIDATED && <Text style={styles.draft}>PROJET — texte en attente de validation</Text>}
        <Text style={styles.cgvTitle}>{CGV_PRO_TITLE}</Text>
        <Text style={styles.subtitle}>Kerbooth 360°</Text>
        {CGV_PRO_ARTICLES.map((a) => (
          <View key={a.title} style={styles.cgvArticle} wrap={false}>
            <Text style={styles.cgvArticleTitle}>{a.title}</Text>
            <Text>{a.text}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
