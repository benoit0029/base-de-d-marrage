import { redirect } from "next/navigation";
import { getSingleUser, resumeTotpEnrollment } from "@/server/services/auth";
import SetupForm from "@/components/auth/SetupForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSingleUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 px-4">
        <SetupForm />
      </div>
    );
  }

  if (user.totpEnabled) {
    redirect("/login");
  }

  // Compte créé mais 2FA jamais confirmée (ex. navigateur fermé entre les
  // deux étapes) : reprendre au même secret plutôt que de bloquer le compte.
  const qrCodeDataUrl = await resumeTotpEnrollment(user.id, user.email);

  return (
    <div className="min-h-screen bg-slate-50 px-4">
      <SetupForm resumeTotp={{ qrCodeDataUrl, userId: user.id }} />
    </div>
  );
}
