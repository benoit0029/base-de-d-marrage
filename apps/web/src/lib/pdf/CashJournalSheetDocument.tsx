import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// Fiches vierges à imprimer et découper, pour noter la recette à la main le
// jour de vente (marché, vente à la ferme) — puis prendre une photo de la
// fiche remplie, lue automatiquement par l'agent IA (voir
// extractCashJournalAmount dans lib/mistral/agents.ts). Le format imprimé
// (champs Date/Espèces/Chèques bien séparés, gros caractères) sert aussi à
// fiabiliser cette lecture automatique par rapport à une note libre sur un
// bout de papier quelconque.

export interface CashJournalSheetData {
  activityLabel: string; // "Maraîchage" ou "Revente Fruits/Légumes"
  hasCheck: boolean; // Maraîchage : espèces, chèques, CB + répartition 5,5 % / 10 % ; Fruits/Légumes : espèces seules
  count: number; // nombre de fiches à générer, 3 par page
}

const SHEETS_PER_PAGE = 3;

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: "Helvetica" },
  sheet: {
    height: 250,
    marginBottom: 8,
    padding: 16,
    border: "1pt dashed #94a3b8",
    borderRadius: 6,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
  activity: { fontSize: 11, color: "#475569" },
  fieldRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 14 },
  fieldLabel: { fontSize: 12, width: 165, color: "#1e293b" },
  fieldLine: { flex: 1, borderBottomWidth: 1, borderBottomColor: "#0f172a", height: 22 },
  footer: { marginTop: 4, fontSize: 8, color: "#64748b" },
  // Maraîchage : plus de lignes (CB, total, répartition par taux) dans la
  // même hauteur de fiche, pour garder 3 fiches par page A4.
  fieldRowCompact: { flexDirection: "row", alignItems: "baseline", marginBottom: 8 },
  fieldLineCompact: { flex: 1, borderBottomWidth: 1, borderBottomColor: "#0f172a", height: 19 },
  splitLabel: { fontSize: 11, width: 136, color: "#1e293b" },
  splitGap: { width: 16 },
  dateLabel: { fontSize: 12, width: 110, color: "#1e293b" },
  placeLabel: { fontSize: 12, width: 34, color: "#1e293b" },
  totalLabel: { fontSize: 12, width: 165, color: "#0f172a", fontWeight: 700 },
});

function CompactField({ label, bold = false }: { label: string; bold?: boolean }) {
  return (
    <View style={styles.fieldRowCompact}>
      <Text style={bold ? styles.totalLabel : styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldLineCompact} />
    </View>
  );
}

function Sheet({ activityLabel, hasCheck }: { activityLabel: string; hasCheck: boolean }) {
  return (
    <View style={styles.sheet} wrap={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Fiche de saisie — recette du jour</Text>
        <Text style={styles.activity}>{activityLabel}</Text>
      </View>

      {hasCheck ? (
        <>
          <View style={styles.fieldRowCompact}>
            <Text style={styles.dateLabel}>Date de la vente</Text>
            <View style={styles.fieldLineCompact} />
            <View style={styles.splitGap} />
            <Text style={styles.placeLabel}>Lieu</Text>
            <View style={styles.fieldLineCompact} />
          </View>
          <CompactField label="Espèces (€)" />
          <CompactField label="Chèques (€)" />
          <CompactField label="CB (€)" />
          <CompactField label="Total du jour (€)" bold />
          <View style={styles.fieldRowCompact}>
            <Text style={styles.splitLabel}>Fruits/légumes 5,5 % (€)</Text>
            <View style={styles.fieldLineCompact} />
            <View style={styles.splitGap} />
            <Text style={styles.splitLabel}>Plants potagers 10 % (€)</Text>
            <View style={styles.fieldLineCompact} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date de la vente</Text>
            <View style={styles.fieldLine} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Lieu (marché, ferme…)</Text>
            <View style={styles.fieldLine} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Espèces (€)</Text>
            <View style={styles.fieldLine} />
          </View>
        </>
      )}

      <Text style={styles.footer}>
        Ne pas noter le fond de caisse (30 €) — uniquement la recette du jour.
        {hasCheck
          ? " Fruits/légumes 5,5 % + plants potagers 10 % = total du jour (une répartition du même total, pas des montants en plus)."
          : ""}{" "}
        Vente unitaire {">"} 76 € : à saisir à part dans l&apos;appli, jamais ici.
      </Text>
    </View>
  );
}

export function CashJournalSheetDocument(data: CashJournalSheetData) {
  const pageCount = Math.max(1, Math.ceil(data.count / SHEETS_PER_PAGE));

  return (
    <Document>
      {Array.from({ length: pageCount }).map((_, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {Array.from({ length: SHEETS_PER_PAGE }).map((_, i) => (
            <Sheet key={i} activityLabel={data.activityLabel} hasCheck={data.hasCheck} />
          ))}
        </Page>
      ))}
    </Document>
  );
}
