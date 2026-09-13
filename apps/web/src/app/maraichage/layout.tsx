import SubNav from "@/components/SubNav";
import { activities } from "@/lib/nav";

const activity = activities.find((a) => a.slug === "maraichage")!;

export default function MaraichageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-4 pt-6 md:px-6">
        <h1 className="text-xl font-semibold text-slate-800">
          {activity.label}
        </h1>
        <p className="text-sm text-slate-500">Régime micro-BA avec TVA et 1 salarié</p>
      </div>
      <SubNav
        basePath="/maraichage"
        subTabs={activity.subTabs}
        accentClass={activity.colorClass}
      />
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
