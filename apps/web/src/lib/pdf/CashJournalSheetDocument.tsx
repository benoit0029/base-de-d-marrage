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
  hasCheck: boolean; // Maraîchage : espèces + chèques ; Fruits/Légumes : espèces seules
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
});

function Sheet({ activityLabel, hasCheck }: { activityLabel: string; hasCheck: boolean }) {
  return (
    <View style={styles.sheet} wrap={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Fiche de saisie — recette du jour</Text>
        <Text style={styles.activity}>{activityLabel}</Text>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Date de la vente</Text>
        <View style={styles.fieldLine} />
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Espèces (€)</Text>
        <View style={styles.fieldLine} />
      </View>

      {hasCheck && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Chèques (€)</Text>
          <View style={styles.fieldLine} />
        </View>
      )}

      {hasCheck && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Dont plants potager 10 % (€)</Text>
          <View style={styles.fieldLine} />
        </View>
      )}

      <Text style={styles.footer}>
        Ne pas noter le fond de caisse (30 €) — uniquement la recette du jour.
        {hasCheck
          ? " « Dont plants potager » : part DÉJÀ incluse dans le total du jour (tous paiements confondus), pas un montant en plus — le reste est compté à 5,5 %. CB : voir la capture Up2Pay."
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
