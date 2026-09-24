import SubNav from "@/components/SubNav";
import { syntheseTabs } from "@/lib/nav";

// Synthèse micro-BIC : obligations communes à Revente et Kerbooth (une seule
// micro-entreprise), organisées par sections comme le Maraîchage.
export default function SyntheseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 pt-6 md:px-6">
        <h1 className="text-xl font-semibold text-slate-800">Synthèse micro-BIC</h1>
        <p className="text-sm text-slate-500">
          Revente Fruits/Légumes + Kerbooth 360 : une seule micro-entreprise (même SIRET)
        </p>
      </div>
      <SubNav basePath="/synthese" subTabs={syntheseTabs} accentClass="border-synthese text-synthese" />
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
