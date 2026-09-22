import { activities } from "@/lib/nav";
import { getCompanySettings, listActivitySettings } from "@/server/services/settings";
import { listMailboxConnections } from "@/server/services/mailboxes";
import CompanySettingsForm from "@/components/settings/CompanySettingsForm";
import ActivitySettingsForm from "@/components/settings/ActivitySettingsForm";
import MailboxSettingsForm from "@/components/settings/MailboxSettingsForm";
import PaConnectionForm from "@/components/settings/PaConnectionForm";
import { getPaConnection } from "@/server/services/pa";
import { logout } from "@/app/actions/auth";
import { listClosures, listPendingBlockers, suggestNextClosableYear } from "@/server/services/fiscalYearClosure";
import FiscalYearClosureSection from "@/components/settings/FiscalYearClosureSection";
import { listUnits } from "@/server/services/kerbooth/units";
import KerboothUnitsSection from "@/components/settings/KerboothUnitsSection";

export const dynamic = "force-dynamic";

const activityBySlug: Record<string, "BA_MARAICHAGE" | "BIC_FRUITS_LEGUMES" | "BIC_PHOTOBOOTH"> = {
  maraichage: "BA_MARAICHAGE",
  "fruits-legumes": "BIC_FRUITS_LEGUMES",
  photobooth: "BIC_PHOTOBOOTH",
};

const abEligible = new Set(["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES"]);

export default async function Page() {
  const [company, activitySettings, mailboxConnections, paConnection, closures, blockers, nextClosableYear, kerboothUnits] =
    await Promise.all([
      getCompanySettings(),
      listActivitySettings(),
      listMailboxConnections(),
      getPaConnection(),
      listClosures(),
      listPendingBlockers(),
      suggestNextClosableYear(),
      listUnits(),
    ]);
  const settingsByActivity = new Map(activitySettings.map((s) => [s.activity, s]));
  const mailboxByActivity = new Map(mailboxConnections.map((m) => [m.activity, m]));

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Réglages</h1>
        <p className="text-sm text-slate-500">
          Espace de configuration unique, indépendant des activités.
          L&apos;identité, les boîtes mail de capture et la connexion PA sont
          trois réglages indépendants : vous pouvez les renseigner dans
          l&apos;ordre de votre choix, sans que l&apos;un ne bloque les autres.
        </p>
      </div>

      {/* Identité */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Identité de la micro-entreprise
        </h2>
        <CompanySettingsForm
          key={company?.updatedAt?.toISOString() ?? "new"}
          initial={{
            legalName: company?.legalName ?? "",
            address: company?.address ?? "",
            siren: company?.siren ?? "",
            vatNumber: company?.vatNumber ?? "",
          }}
        />
      </section>

      {/* Réglages par activité */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Logos, certification AB et facturation par activité
        </h2>
        <div className="mt-4 space-y-5">
          {activities.map((activity) => {
            const dbActivity = activityBySlug[activity.slug];
            const s = settingsByActivity.get(dbActivity);
            return (
              <div
                key={activity.slug}
                className={`rounded-md border-l-4 bg-slate-50 p-3 ${activity.colorClass}`}
              >
                <p className="text-sm font-medium text-slate-800">{activity.label}</p>
                <ActivitySettingsForm
                  activity={dbActivity}
                  abEligible={abEligible.has(dbActivity)}
                  companyContactEmail={company?.contactEmail ?? ""}
                  initial={{
                    logoUrl: s?.logoUrl ?? null,
                    abCertificationCode: s?.abCertificationCode ?? null,
                    abLogoEnabled: s?.abLogoEnabled ?? false,
                    invoicingEnabled: s?.invoicingEnabled ?? false,
                    contactEmail: s?.contactEmail ?? "",
                    tvaInstallmentsEnabled: s?.tvaInstallmentsEnabled ?? true,
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Boîtes mail de capture */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Boîtes mail de capture (une par activité)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Chaque activité a sa propre boîte mail dédiée à la réception des
          factures/reçus. La boîte d&apos;origine est transmise à l&apos;agent
          de classement comme indice quasi certain de l&apos;activité. Le
          test de connexion se fait immédiatement à l&apos;enregistrement.
        </p>
        <div className="mt-4 space-y-3">
          {activities.map((activity) => {
            const dbActivity = activityBySlug[activity.slug];
            const m = mailboxByActivity.get(dbActivity);
            return (
              <MailboxSettingsForm
                key={activity.slug}
                activity={dbActivity}
                label={activity.label}
                initial={{
                  imapHost: m?.imapHost ?? "",
                  imapPort: m?.imapPort ?? 993,
                  imapUser: m?.imapUser ?? "",
                  hasPassword: Boolean(m?.imapPasswordEncrypted),
                  status: m?.status ?? "NOT_TESTED",
                  lastError: m?.lastError ?? null,
                }}
              />
            );
          })}
        </div>
      </section>

      {/* Connexion PA */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Connexion à la Plateforme Agréée (facturation électronique)
        </h2>
        <PaConnectionForm status={paConnection?.status ?? "DISCONNECTED"} />
      </section>

      {/* Kerbooth 360° — Unités */}
      <KerboothUnitsSection
        units={kerboothUnits.map((u) => ({
          id: u.id,
          label: u.label,
          baseLocation: u.baseLocation,
          ownerLabel: u.ownerLabel,
          active: u.active,
        }))}
      />

      {/* Clôture d'exercice */}
      <FiscalYearClosureSection
        closures={closures.map((c) => ({
          year: c.year,
          closedAt: c.closedAt.toLocaleDateString("fr-FR"),
          zipFileUrl: c.zipFileUrl,
        }))}
        blockers={blockers}
        nextClosableYear={nextClosableYear}
      />

      {/* Session */}
      <section className="rounded-lg border bg-white p-4 md:hidden">
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Déconnexion
          </button>
        </form>
      </section>
    </div>
  );
}
