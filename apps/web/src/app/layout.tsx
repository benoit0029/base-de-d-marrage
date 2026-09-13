import type { Metadata, Viewport } from "next";
import TopNav from "@/components/TopNav";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compta ferme & activités",
  description:
    "Comptabilité auto-hébergée pilotée par IA pour le maraîchage (micro-BA) et les activités micro-BIC (fruits/légumes, Kerbooth 360°).",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Compta ferme",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f7d4f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 pb-16 md:pb-0">
        <TopNav />
        <main>{children}</main>
        <PwaRegister />
      </body>
    </html>
  );
}
