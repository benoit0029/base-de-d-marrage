import { activities } from "@/lib/nav";

const abEligible = new Set(["maraichage", "fruits-legumes"]);

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Réglages</h1>
        <p className="text-sm text-slate-500">
          Espace de configuration unique, indépendant des activités. Les deux
          sections ci-dessous (identité et connexion PA) sont indépendantes :
          vous pouvez les renseigner dans l&apos;ordre de votre choix.
        </p>
      </div>

      {/* Identité */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Identité de la micro-entreprise
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-600">Nom / raison sociale</span>
            <input
              disabled
              placeholder="Ex. Ferme de Kerbooth"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-500"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">SIREN</span>
            <input
              disabled
              placeholder="123 456 789"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-500"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-slate-600">Adresse</span>
            <input
              disabled
              placeholder="Adresse complète de l'exploitation"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-500"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">TVA intracommunautaire</span>
            <input
              disabled
              placeholder="FR XX 123456789"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-500"
            />
          </label>
        </div>
      </section>

      {/* Réglages par activité */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Logos, couleur d&apos;accent et certification AB par activité
        </h2>
        <div className="mt-4 space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.slug}
              className={`rounded-md border-l-4 bg-slate-50 p-3 ${activity.colorClass}`}
            >
              <p className="text-sm font-medium text-slate-800">{activity.label}</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-slate-600">Logo</span>
                  <input
                    disabled
                    type="file"
                    className="mt-1 w-full text-sm text-slate-500"
                  />
                </label>
                {abEligible.has(activity.slug) ? (
                  <label className="text-sm">
                    <span className="text-slate-600">
                      Code organisme certificateur AB
                    </span>
                    <input
                      disabled
                      placeholder="FR-BIO-XX"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-500"
                    />
                  </label>
                ) : (
                  <p className="self-end text-xs text-slate-400">
                    Certification AB non applicable à cette activité.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          L&apos;emplacement et la taille exacts du logo AB sur les documents
          seront fixés en phase 4, après vérification du guide INAO
          « Règles d&apos;usage de la marque AB ».
        </p>
      </section>

      {/* Connexion PA */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Connexion à la Plateforme Agréée (facturation électronique)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Fournisseur retenu : Abby (plan gratuit). La connexion effective
          sera disponible en phase 5.
        </p>
        <button
          type="button"
          disabled
          title="Disponible en phase 5"
          className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white opacity-60"
        >
          Connecter Abby
        </button>
      </section>

      <button
        type="button"
        disabled
        title="Persistance en base disponible à partir de la phase 3"
        className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
      >
        Enregistrer
      </button>
    </div>
  );
}
