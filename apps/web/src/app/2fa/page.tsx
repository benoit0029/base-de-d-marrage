import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PENDING_2FA_COOKIE, verifyPending2faToken } from "@/lib/auth/session";
import TotpLoginForm from "@/components/auth/TotpLoginForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jar = await cookies();
  const token = jar.get(PENDING_2FA_COOKIE)?.value;
  const pending = token ? await verifyPending2faToken(token) : null;

  if (!pending) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4">
      <TotpLoginForm />
    </div>
  );
}
