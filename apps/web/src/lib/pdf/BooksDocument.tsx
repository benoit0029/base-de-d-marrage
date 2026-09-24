import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { euro } from "@/lib/pdf/format";
import type { PurchaseBook, PurchaseSection, ReceiptBook, ReceiptRow, ReceiptTotals } from "@/lib/livres";

// Version imprimable (A4 paysage, pages numérotées « x / y ») du livre des
// recettes et du livre des achats — même contenu que les onglets, voir
// lib/livres.

export interface BookHeader {
  legalName: string;
  siren: string;
  title: string; // "Livre des recettes", "Registre des achats"…
  subtitle: string; // activité et précisions
}

// Pas de coupure de mots avec trait d'union (« Con-carneau ») : un mot trop
// long passe entier à la ligne suivante.
Font.registerHyphenationCallback((word) => [word]);

const QUARTER_LABEL = ["1er trimestre", "2e trimestre", "3e trimestre", "4e trimestre"];

const styles = StyleSheet.create({
  page: { padding: 24, paddingBottom: 36, fontSize: 7.5, fontFamily: "Helvetica", color: "#1e293b" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 13, fontWeight: 700 },
  meta: { fontSize: 8, color: "#475569" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 2 },
  headRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#94a3b8", paddingVertical: 3, backgroundColor: "#f1f5f9" },
  quarterRow: { paddingVertical: 3, marginTop: 4, fontWeight: 700, color: "#334155" },
  subtotalRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#64748b", paddingVertical: 2, fontWeight: 700 },
  totalRow: { flexDirection: "row", borderTopWidth: 1.5, borderTopColor: "#0f172a", paddingVertical: 3, marginTop: 6, fontWeight: 700 },
  footer: { position: "absolute", bottom: 14, left: 24, right: 24, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#64748b" },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginTop: 10, marginBottom: 4 },
});

const num = (n: number) => (n ? euro(n) : "—");

function Footer({ label }: { label: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{label}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// ----- Livre des recettes -----------------------------------------------

const RC = { date: 44, label: 150, ref: 70, amount: 46 };
const pad = { paddingRight: 4 };

function ReceiptAmounts({ r }: { r: ReceiptRow | ReceiptTotals }) {
  const cells = [r.cash, r.check, r.card, r.other, r.ttc, r.byRate[5.5].ht, r.byRate[5.5].vat, r.byRate[10].ht, r.byRate[10].vat, r.byRate[20].ht, r.byRate[20].vat];
  return (
    <>
      {cells.map((n, i) => (
        <Text key={i} style={{ width: RC.amount, textAlign: "right" }}>
          {num(n)}
        </Text>
      ))}
    </>
  );
}

export function ReceiptBookDocument({ book, header }: { book: ReceiptBook; header: BookHeader }) {
  const heads = ["Espèces", "Chèques", "CB", "Autres", "Total TTC", "HT 5,5 %", "TVA 5,5 %", "HT 10 %", "TVA 10 %", "HT 20 %", "TVA 20 %"];
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {header.title} — {book.year}
            </Text>
            <Text style={styles.meta}>{header.subtitle}</Text>
          </View>
          <View>
            <Text style={styles.meta}>{header.legalName}</Text>
            <Text style={styles.meta}>SIREN : {header.siren}</Text>
          </View>
        </View>
        <View style={styles.headRow} fixed>
          <Text style={{ width: RC.date }}>Date</Text>
          <Text style={{ width: RC.label }}>Libellé</Text>
          <Text style={{ width: RC.ref }}>Justificatif</Text>
          {heads.map((h) => (
            <Text key={h} style={{ width: RC.amount, textAlign: "right" }}>
              {h}
            </Text>
          ))}
        </View>
        {book.quarters.map((q) => (
          <View key={q.quarter}>
            <Text style={styles.quarterRow}>{QUARTER_LABEL[q.quarter - 1]}</Text>
            {q.rows.map((r, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={{ width: RC.date }}>{r.date.toLocaleDateString("fr-FR")}</Text>
                <Text style={{ width: RC.label, ...pad }}>{r.label}</Text>
                <Text style={{ width: RC.ref, ...pad }}>{r.reference}</Text>
                <ReceiptAmounts r={r} />
              </View>
            ))}
            <View style={styles.subtotalRow} wrap={false}>
              <Text style={{ width: RC.date + RC.label + RC.ref }}>Total {QUARTER_LABEL[q.quarter - 1]}</Text>
              <ReceiptAmounts r={q.totals} />
            </View>
          </View>
        ))}
        <View style={styles.totalRow} wrap={false}>
          <Text style={{ width: RC.date + RC.label + RC.ref }}>Total {book.year}</Text>
          <ReceiptAmounts r={book.totals} />
        </View>
        <Footer label={`${header.title} ${book.year} — ${header.legalName}`} />
      </Page>
    </Document>
  );
}

// ----- Livre des achats -------------------------------------------------

const PC = { date: 76, supplier: 190, nature: 274, amount: 80 };

function PurchaseSectionView({ title, section }: { title: string; section: PurchaseSection }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.headRow}>
        <Text style={{ width: PC.date }}>Date de paiement</Text>
        <Text style={{ width: PC.supplier }}>Fournisseur</Text>
        <Text style={{ width: PC.nature }}>Nature</Text>
        <Text style={{ width: PC.amount, textAlign: "right" }}>HT</Text>
        <Text style={{ width: PC.amount, textAlign: "right" }}>TVA</Text>
        <Text style={{ width: PC.amount, textAlign: "right" }}>TTC</Text>
      </View>
      {section.quarters.map((q) => (
        <View key={q.quarter}>
          <Text style={styles.quarterRow}>{QUARTER_LABEL[q.quarter - 1]}</Text>
          {q.rows.map((r, i) => (
            <View key={i} style={styles.row} wrap={false}>
              <Text style={{ width: PC.date }}>{r.date.toLocaleDateString("fr-FR")}</Text>
              <Text style={{ width: PC.supplier, ...pad }}>{r.supplier}</Text>
              <Text style={{ width: PC.nature, ...pad }}>{r.nature}</Text>
              <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(r.ht)}</Text>
              <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(r.vat)}</Text>
              <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(r.ttc)}</Text>
            </View>
          ))}
          <View style={styles.subtotalRow} wrap={false}>
            <Text style={{ width: PC.date + PC.supplier + PC.nature }}>Total {QUARTER_LABEL[q.quarter - 1]}</Text>
            <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(q.totals.ht)}</Text>
            <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(q.totals.vat)}</Text>
            <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(q.totals.ttc)}</Text>
          </View>
        </View>
      ))}
      <View style={styles.totalRow} wrap={false}>
        <Text style={{ width: PC.date + PC.supplier + PC.nature }}>Total {title.toLowerCase()}</Text>
        <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(section.totals.ht)}</Text>
        <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(section.totals.vat)}</Text>
        <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(section.totals.ttc)}</Text>
      </View>
    </View>
  );
}

export function PurchaseBookDocument({ book, header }: { book: PurchaseBook; header: BookHeader }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {header.title} — {book.year}
            </Text>
            <Text style={styles.meta}>{header.subtitle}</Text>
          </View>
          <View>
            <Text style={styles.meta}>{header.legalName}</Text>
            <Text style={styles.meta}>SIREN : {header.siren}</Text>
          </View>
        </View>
        <PurchaseSectionView title="Immobilisations" section={book.immobilisations} />
        <PurchaseSectionView title="Autres achats" section={book.autres} />
        <View style={styles.totalRow} wrap={false}>
          <Text style={{ width: PC.date + PC.supplier + PC.nature }}>Total des achats {book.year}</Text>
          <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(book.totals.ht)}</Text>
          <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(book.totals.vat)}</Text>
          <Text style={{ width: PC.amount, textAlign: "right" }}>{euro(book.totals.ttc)}</Text>
        </View>
        <Footer label={`${header.title} ${book.year} — ${header.legalName}`} />
      </Page>
    </Document>
  );
}
