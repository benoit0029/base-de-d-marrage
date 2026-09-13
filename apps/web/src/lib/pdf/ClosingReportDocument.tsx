import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { euro } from "@/lib/pdf/format";

export interface ActivitySummary {
  label: string;
  recettesHt: number;
  achatsHt: number;
}

export interface ClosingReportData {
  year: number;
  generatedAt: string;
  activities: ActivitySummary[];
  thresholds: Array<{ label: string; caCumule: number; seuil: number; level: string }>;
}

const levelLabel: Record<string, string> = {
  ok: "OK",
  vigilance: "Vigilance",
  depassement: "Seuil dépassé",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 9, color: "#475569", marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#cbd5e1", paddingVertical: 4 },
  headerCell: { fontSize: 8, textTransform: "uppercase", color: "#64748b" },
  col1: { flex: 2 },
  col: { flex: 1, textAlign: "right" },
});

export function ClosingReportDocument(data: ClosingReportData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Rapport de clôture — exercice {data.year}</Text>
        <Text style={styles.meta}>Généré automatiquement le {data.generatedAt}</Text>

        <Text style={styles.sectionTitle}>Synthèse par activité (écritures validées)</Text>
        <View style={styles.headerRow}>
          <Text style={[styles.col1, styles.headerCell]}>Activité</Text>
          <Text style={[styles.col, styles.headerCell]}>Recettes HT</Text>
          <Text style={[styles.col, styles.headerCell]}>Achats HT</Text>
          <Text style={[styles.col, styles.headerCell]}>Résultat</Text>
        </View>
        {data.activities.map((a, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.col1}>{a.label}</Text>
            <Text style={styles.col}>{euro(a.recettesHt)}</Text>
            <Text style={styles.col}>{euro(a.achatsHt)}</Text>
            <Text style={styles.col}>{euro(a.recettesHt - a.achatsHt)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Seuils et alertes</Text>
        <View style={styles.headerRow}>
          <Text style={[styles.col1, styles.headerCell]}>Seuil</Text>
          <Text style={[styles.col, styles.headerCell]}>CA cumulé</Text>
          <Text style={[styles.col, styles.headerCell]}>Plafond</Text>
          <Text style={[styles.col, styles.headerCell]}>Statut</Text>
        </View>
        {data.thresholds.map((t, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.col1}>{t.label}</Text>
            <Text style={styles.col}>{euro(t.caCumule)}</Text>
            <Text style={styles.col}>{euro(t.seuil)}</Text>
            <Text style={styles.col}>{levelLabel[t.level] ?? t.level}</Text>
          </View>
        ))}

        <Text style={{ marginTop: 24, fontSize: 8, color: "#94a3b8" }}>
          Document généré automatiquement — seuils indicatifs (barème
          2024-2025), à vérifier sur impots.gouv.fr avant toute décision.
        </Text>
      </Page>
    </Document>
  );
}
