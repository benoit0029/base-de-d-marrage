import Link from "next/link";
import { activities } from "@/lib/nav";
import { hiddenActivities } from "@/lib/visibility";

export default async function HomePage() {
  const hidden = await hiddenActivities();
  const shown = activities.filter((a) => !hidden.includes(a.slug));
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold text-slate-800">
        Bonjour 👋
      </h1>
      <p className="mt-2 text-slate-600">
        Vue d&apos;ensemble de {shown.length > 1 ? `vos ${shown.length} activités` : "votre activité"}. Les écritures marquées
        « en attente » ont été proposées automatiquement par le pipeline de
        capture (email, photo, extraction IA) et attendent votre validation.
      </p>

      <div className={`mt-6 grid gap-4 ${shown.length > 1 ? "sm:grid-cols-3" : ""}`}>
        {shown.map((activity) => (
          <Link
            key={activity.slug}
            href={`/${activity.slug}/recettes`}
            className={`rounded-lg border-2 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${activity.colorClass}`}
          >
            <p className="text-sm font-semibold">{activity.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              Recettes, achats, facturation
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link
          href="/synthese"
          className="rounded-lg border-2 border-synthese bg-white p-4 text-synthese shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-semibold">Synthèse micro-BIC</p>
          <p className="mt-1 text-xs text-slate-500">
            CA cumulé, seuils, 2042 C PRO
          </p>
        </Link>
        <Link
          href="/reglages"
          className="rounded-lg border-2 border-slate-300 bg-white p-4 text-slate-700 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-semibold">⚙️ Réglages</p>
          <p className="mt-1 text-xs text-slate-500">
            Identité, logos, code AB, connexion PA
          </p>
        </Link>
      </div>
    </div>
  );
}
