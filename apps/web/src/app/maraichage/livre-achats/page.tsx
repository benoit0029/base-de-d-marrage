import PurchaseBookPage from "@/components/books/PurchaseBookPage";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  const y = year && Number.isInteger(Number(year)) ? Number(year) : new Date().getFullYear();
  return <PurchaseBookPage activity="BA_MARAICHAGE" year={y} />;
}
