import SubNav from "@/components/SubNav";
import { notFound } from "next/navigation";
import { activities } from "@/lib/nav";
import { isActivityHidden } from "@/lib/visibility";

const activity = activities.find((a) => a.slug === "fruits-legumes")!;

export default async function FruitsLegumesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await isActivityHidden("fruits-legumes")) notFound();
  return (
    <div>
      <div className="px-4 pt-6 md:px-6">
        <h1 className="text-xl font-semibold text-slate-800">
          {activity.label}
        </h1>
        <p className="text-sm text-slate-500">
          Micro-BIC — partage les seuils de franchise TVA avec Kerbooth 360
        </p>
      </div>
      <SubNav
        basePath="/fruits-legumes"
        subTabs={activity.subTabs}
        accentClass={activity.colorClass}
      />
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
