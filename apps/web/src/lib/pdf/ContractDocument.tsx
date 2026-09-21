import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { euro } from "@/lib/pdf/format";

// Reprend le modèle de contrat validé dans
// kerbooth360/documents/documents-types-kerbooth360.md §5, rempli
// automatiquement avec les données de la réservation — c'est ce PDF qui est
// envoyé à Yousign pour signature (voir server/services/kerboothContractPdf.ts).

export interface ContractPdfData {
  loueur: {
    legalName: string;
    address: string;
    siren: string;
  };
  client: {
    name: string;
  };
  bookingId: string;
  formulaLabel: string;
  eventDateStart: string;
  eventDateEnd: string;
  eventLocation: string;
  totalAmount: number;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b", lineHeight: 1.5 },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 24 },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  partyBlock: { maxWidth: 240 },
  partyLabel: { fontSize: 8, textTransform: "uppercase", color: "#64748b", marginBottom: 4 },
  partyName: { fontWeight: 700 },
  meta: { fontSize: 9, color: "#475569" },
  intro: { marginBottom: 16 },
  clause: { marginBottom: 10 },
  clauseNumber: { fontWeight: 700 },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  signatureBlock: { width: 220, borderTopWidth: 1, borderTopColor: "#94a3b8", paddingTop: 6 },
  footer: { marginTop: 24, fontSize: 8, color: "#64748b" },
});

export function ContractDocument(data: ContractPdfData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONTRAT DE LOCATION — PHOTOBOOTH 360°</Text>

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
          </View>
        </View>

        <Text style={styles.intro}>Il a été convenu ce qui suit :</Text>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>1. Objet — </Text>
            Mise à disposition, sans animation ni présence pendant l&apos;usage, d&apos;un
            photobooth 360° pour l&apos;événement du {data.eventDateStart}
            {data.eventDateStart !== data.eventDateEnd ? ` au ${data.eventDateEnd}` : ""}, à{" "}
            {data.eventLocation}.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>2. Formule retenue — </Text>
            {data.formulaLabel}
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>3. Montant total — </Text>
            {euro(data.totalAmount)}, réglé en une seule fois à la confirmation du présent
            contrat signé, non remboursable en cas d&apos;annulation (voir CGV article 5).
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>4. Livraison et récupération — </Text>
            Le Loueur installe le matériel avant le début du créneau loué et le récupère à
            la fin. Le Locataire n&apos;est pas assisté par un animateur pendant la durée de
            la location.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>5. Garde du matériel — </Text>
            À compter de la livraison et jusqu&apos;à la récupération, le Locataire a la
            garde du matériel et en répond conformément à l&apos;article 1732 du Code civil.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>6. Dépôt de garantie — </Text>
            Un chèque de caution de 1 500 € est remis au Loueur à la livraison (état des
            lieux d&apos;entrée) et restitué à la récupération, sauf dégradation constatée à
            l&apos;état des lieux de sortie.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>7. Obligations du Locataire — </Text>
            Mise à disposition d&apos;un espace adapté (surface, accès électrique),
            information de ses invités sur l&apos;utilisation de leurs images (voir Politique
            de confidentialité annexée), souscription d&apos;une assurance couvrant sa
            responsabilité de locataire.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text>
            <Text style={styles.clauseNumber}>8. CGV — </Text>
            Le Locataire reconnaît avoir pris connaissance des CGV de Kerbooth 360°,
            annexées au présent contrat, et notamment de l&apos;absence de droit de
            rétractation applicable (art. L221-28 12° du Code de la consommation) et du
            caractère non remboursable du prix versé (article 5 des CGV).
          </Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text>Le Loueur</Text>
            <Text style={styles.meta}>Signature électronique</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text>Le Locataire</Text>
            <Text style={styles.meta}>Signature électronique</Text>
          </View>
        </View>

        <Text style={styles.footer}>Réservation n° {data.bookingId} — Signé électroniquement via Yousign.</Text>
      </Page>
    </Document>
  );
}
