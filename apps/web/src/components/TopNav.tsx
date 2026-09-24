"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { topLevelNav, type ActivityNav } from "@/lib/nav";
import { logout } from "@/app/actions/auth";

const AUTH_PATHS = ["/login", "/setup", "/2fa"];

function isActive(pathname: string, slug: string) {
  return pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);
}

// Libellés courts pour la barre d'onglets mobile (évite le retour à la ligne inégal).
const mobileLabels: Record<string, string> = {
  maraichage: "Maraîchage",
  "fruits-legumes": "Fruits/Légumes",
  photobooth: "Kerbooth 360",
  synthese: "Synthèse",
};

export default function TopNav({ hidden = [] }: { hidden?: ActivityNav["slug"][] }) {
  const pathname = usePathname();
  const nav = topLevelNav.filter((item) => !hidden.includes(item.slug as ActivityNav["slug"]));

  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <>
      {/* Desktop */}
      <header className="hidden md:flex items-center justify-between border-b bg-white px-6 py-3">
        <Link href="/" className="font-semibold text-slate-800">
          Compta ferme &amp; activités
        </Link>
        <nav className="flex gap-1">
          {nav.map((item) => (
            <Link
              key={item.slug}
              href={`/${item.slug}`}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(pathname, item.slug)
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/reglages"
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              isActive(pathname, "reglages")
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ⚙️ Réglages
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      {/* Mobile top bar (juste le titre + réglages, la nav principale est en bas) */}
      <header className="flex md:hidden items-center justify-between border-b bg-white px-4 py-3">
        <span className="font-semibold text-slate-800">Compta</span>
        <Link href="/reglages" aria-label="Réglages" className="text-xl">
          ⚙️
        </Link>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 grid border-t bg-white md:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map((item) => (
          <Link
            key={item.slug}
            href={`/${item.slug}`}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              isActive(pathname, item.slug) ? "text-slate-900" : "text-slate-400"
            }`}
          >
            <span className="whitespace-nowrap leading-none">
              {mobileLabels[item.slug] ?? item.label}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
