"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SubTab } from "@/lib/nav";

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

  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-white px-4 md:px-6">
      {subTabs.map((tab) => {
        const href = `${basePath}/${tab.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
              active
                ? accentClass
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
