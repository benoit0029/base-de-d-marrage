"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SubTab } from "@/lib/nav";

// Sous-navigation d'une activité. Si les onglets portent une section
// (Maraîchage : Vue d'ensemble / Comptable / Fiscal / Social / Abby), une
// première ligne affiche les sections et la seconde les onglets de la section
// courante ; sinon, simple liste d'onglets.
export default function SubNav({
  basePath,
  subTabs,
  accentClass,
}: {
  basePath: string;
  subTabs: SubTab[];
  accentClass: string;
}) {
  const pathname = usePathname();
  const activeTab = subTabs.find((t) => pathname === `${basePath}/${t.slug}`);
  const sections = [...new Set(subTabs.map((t) => t.section).filter((s): s is string => !!s))];
  const activeSection = activeTab?.section ?? sections[0];
  const visibleTabs = sections.length > 0 ? subTabs.filter((t) => t.section === activeSection) : subTabs;

  return (
    <div className="border-b bg-white">
      {sections.length > 0 && (
        <nav className="flex gap-2 overflow-x-auto px-4 pt-2 md:px-6">
          {sections.map((section) => {
            const first = subTabs.find((t) => t.section === section)!;
            const active = section === activeSection;
            return (
              <Link
                key={section}
                href={`${basePath}/${first.slug}`}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  active ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-800"
                }`}
              >
                {section}
              </Link>
            );
          })}
        </nav>
      )}
      <nav className="flex gap-1 overflow-x-auto px-4 md:px-6">
        {visibleTabs.map((tab) => {
          const href = `${basePath}/${tab.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.slug}
              href={href}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                active ? accentClass : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
