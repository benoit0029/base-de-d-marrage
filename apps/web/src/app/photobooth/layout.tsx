import SubNav from "@/components/SubNav";
import { activities } from "@/lib/nav";

const activity = activities.find((a) => a.slug === "photobooth")!;

export default function PhotoboothLayout({
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
        <p className="text-sm text-slate-500">
          Micro-BIC — partage les seuils de franchise TVA avec Fruits/Légumes
        </p>
      </div>
      <SubNav
        basePath="/photobooth"
        subTabs={activity.subTabs}
        accentClass={activity.colorClass}
      />
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
