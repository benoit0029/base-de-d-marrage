import ReceiptBookPage from "@/components/books/ReceiptBookPage";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  const y = year && Number.isInteger(Number(year)) ? Number(year) : new Date().getFullYear();
  return <ReceiptBookPage activity="BIC_PHOTOBOOTH" year={y} />;
}
