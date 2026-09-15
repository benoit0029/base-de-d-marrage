import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { euro } from "@/lib/pdf/format";

export interface CreanceRow {
  activity: string;
  number: string;
  clientName: string;
  issueDate: string;
  totalTtc: number;
}

export interface DetteRow {
  activity: string;
  counterpartyName: string;
  date: string;
  amountTtc: number;
}

export interface ClosureRecapData {
  year: number;
  generatedAt: string;
  creances: CreanceRow[];
  dettes: DetteRow[];
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 9, color: "#475569", marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#cbd5e1", paddingVertical: 4 },
  headerCell: { fontSize: 8, textTransform: "uppercase", color: "#64748b" },
  col1: { flex: 2 },
  col2: { flex: 2 },
  col: { flex: 1, textAlign: "right" },
  empty: { fontSize: 9, color: "#64748b", fontStyle: "italic", marginBottom: 8 },
});

// Récapitulatif des créances (factures encaissables non encore encaissées) et
// dettes (dépenses validées non encore payées) en cours au moment de la
// clôture — transversal aux 3 activités, jamais rattaché à un exercice
// précis puisque ces lignes rejoindront l'exercice de leur paiement réel une
// fois réglées (comptabilité de caisse, voir BOI-BA-BASE-20-10).
export function ClosureRecapDocument(data: ClosureRecapData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Créances et dettes en cours — clôture {data.year}</Text>
        <Text style={styles.meta}>
          Généré automatiquement le {data.generatedAt}. Ces lignes ne sont rattachées à
          aucun exercice : elles rejoindront l&apos;exercice de leur encaissement/paiement
          réel une fois réglées.
        </Text>

        <Text style={styles.sectionTitle}>
          Créances en cours — factures émises, non encore encaissées
        </Text>
        {data.creances.length === 0 ? (
          <Text style={styles.empty}>Aucune créance en cours.</Text>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Text style={[styles.col1, styles.headerCell]}>Activité</Text>
              <Text style={[styles.col2, styles.headerCell]}>N° facture / client</Text>
              <Text style={[styles.col, styles.headerCell]}>Date facture</Text>
              <Text style={[styles.col, styles.headerCell]}>Montant TTC</Text>
            </View>
            {data.creances.map((c, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.col1}>{c.activity}</Text>
                <Text style={styles.col2}>
                  {c.number} — {c.clientName}
                </Text>
                <Text style={styles.col}>{c.issueDate}</Text>
                <Text style={styles.col}>{euro(c.totalTtc)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>
          Dettes en cours — dépenses validées, non encore payées
        </Text>
        {data.dettes.length === 0 ? (
          <Text style={styles.empty}>Aucune dette en cours.</Text>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Text style={[styles.col1, styles.headerCell]}>Activité</Text>
              <Text style={[styles.col2, styles.headerCell]}>Fournisseur</Text>
              <Text style={[styles.col, styles.headerCell]}>Date facture</Text>
              <Text style={[styles.col, styles.headerCell]}>Montant TTC</Text>
            </View>
            {data.dettes.map((d, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.col1}>{d.activity}</Text>
                <Text style={styles.col2}>{d.counterpartyName}</Text>
                <Text style={styles.col}>{d.date}</Text>
                <Text style={styles.col}>{euro(d.amountTtc)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={{ marginTop: 24, fontSize: 8, color: "#94a3b8" }}>
          Document généré automatiquement — état des créances/dettes au moment de la clôture.
        </Text>
      </Page>
    </Document>
  );
}
