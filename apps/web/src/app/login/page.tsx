import { redirect } from "next/navigation";
import { countUsers } from "@/server/services/auth";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  if ((await countUsers()) === 0) {
    redirect("/setup");
  }
  if (await getCurrentUserId()) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4">
      <LoginForm />
    </div>
  );
}
