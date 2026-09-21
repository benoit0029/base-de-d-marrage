import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Reste compatible Edge runtime (pas d'accès Prisma ici) : vérifie seulement
// la signature/expiration du cookie de session. La logique qui dépend de la
// base (compte déjà créé ? 2FA activée ?) vit dans les pages /login et
// /setup (Server Components, runtime Node), pas ici.
const PUBLIC_PATHS = ["/login", "/setup", "/2fa"];
const PUBLIC_API_PREFIXES = ["/api/agents/", "/api/reports/", "/api/kerbooth/"]; // authentifiés par jeton partagé, pas par session

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Toutes les routes sauf les assets statiques Next.js et les fichiers publics (PWA, favicon...).
    "/((?!_next/static|_next/image|favicon.ico|icons/|apple-touch-icon.png|manifest.json|sw.js|uploads/).*)",
  ],
};
